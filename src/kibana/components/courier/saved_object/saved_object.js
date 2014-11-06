define(function (require) {
  return function SavedObjectFactory(es, configFile, Promise, Private, Notifier, indexPatterns) {
    var errors = require('errors');
    var angular = require('angular');
    var _ = require('lodash');
    var slugifyId = require('utils/slugify_id');

    var DocSource = Private(require('components/courier/data_source/doc_source'));
    var SearchSource = Private(require('components/courier/data_source/search_source'));
    var mappingSetup = Private(require('utils/mapping_setup'));

    function SavedObject(config) {
      if (!_.isObject(config)) config = {};

      // save an easy reference to this
      var obj = this;

      /************
       * Initialize config vars
       ************/
      // the doc which is used to store this object
      var docSource = new DocSource();

      // type name for this object, used as the ES-type
      var type = config.type;

      // Create a notifier for sending alerts
      var notify = new Notifier({
        location: 'Saved ' + type
      });

      // mapping definition for the fields that this object will expose
      var mapping = mappingSetup.expandShorthand(config.mapping);

      // default field values, assigned when the source is loaded
      var defaults = config.defaults || {};

      var afterESResp = config.afterESResp || _.noop;
      var customInit = config.init || _.noop;

      // optional search source which this object configures
      obj.searchSource = config.searchSource && new SearchSource();

      // the id of the document
      obj.id = config.id || void 0;

      /**
       * Asynchronously initialize this object - will only run
       * once even if called multiple times.
       *
       * @return {Promise}
       * @resolved {SavedObject}
       */
      obj.init = _.once(function () {
        // ensure that the type is defined
        if (!type) throw new Error('You must define a type name to use SavedObject objects.');

        // tell the docSource where to find the doc
        docSource
        .index(configFile.kibanaIndex)
        .type(type)
        .id(obj.id);

        // check that the mapping for this type is defined
        return mappingSetup.isDefined(type)
        .then(function (defined) {
          // if it is already defined skip this step
          if (defined) return true;

          mapping.kibanaSavedObjectMeta = {
            properties: {
              // setup the searchSource mapping, even if it is not used but this type yet
              searchSourceJSON: {
                type: 'string'
              }
            }
          };

          // tell mappingSetup to set type
          return mappingSetup.setup(type, mapping);
        })
        .then(function () {
          // If there is not id, then there is no document to fetch from elasticsearch
          if (!obj.id) {
            // just assign the defaults and be done
            _.assign(obj, defaults);
            return hydrateIndexPattern().then(function () {
              return afterESResp.call(obj);
            });
          }

          // fetch the object from ES
          return docSource.fetch()
          .then(function applyESResp(resp) {

            obj._source = _.cloneDeep(resp._source);

            if (!resp.found) throw new errors.SavedObjectNotFound(type, obj.id);

            var meta = resp._source.kibanaSavedObjectMeta || {};
            delete resp._source.kibanaSavedObjectMeta;

            if (!config.indexPattern && obj._source.indexPattern) {
              config.indexPattern = obj._source.indexPattern;
              delete obj._source.indexPattern;
            }

            // assign the defaults to the response
            _.defaults(obj._source, defaults);

            // transform the source using _deserializers
            _.forOwn(mapping, function ittr(fieldMapping, fieldName) {
              if (fieldMapping._deserialize) {
                obj._source[fieldName] = fieldMapping._deserialize(obj._source[fieldName], resp, fieldName, fieldMapping);
              }
            });

            // Give obj all of the values in _source.fields
            _.assign(obj, obj._source);

            return Promise.try(function () {
              // if we have a searchSource, set it's state based on the searchSourceJSON field
              if (obj.searchSource) {
                var state = {};
                try {
                  state = JSON.parse(meta.searchSourceJSON);
                } catch (e) {}
                obj.searchSource.set(state);
              }
            })
            .then(hydrateIndexPattern)
            .then(function () {
              return Promise.cast(afterESResp.call(obj, resp));
            })
            .then(function () {
              // Any time obj is updated, re-call applyESResp
              docSource.onUpdate().then(applyESResp, notify.fatal);
            });
          });
        })
        .then(function () {
          return customInit.call(obj);
        })
        .then(function () {
          // return our obj as the result of init()
          return obj;
        });
      });

      /**
       * After creation or fetching from ES, ensure that the searchSources index indexPattern
       * is an bonafide IndexPattern object.
       *
       * @return {[type]} [description]
       */
      function hydrateIndexPattern() {
        return Promise.try(function () {
          if (obj.searchSource) {

            var index = config.indexPattern || obj.searchSource.getOwn('index');
            if (!index) return;
            if (config.clearSavedIndexPattern) {
              obj.searchSource.set('index', undefined);
              return;
            }

            if (!(index instanceof indexPatterns.IndexPattern)) {
              index = indexPatterns.get(index);
            }

            return Promise.resolve(index).then(function (indexPattern) {
              obj.searchSource.set('index', indexPattern);
            });
          }
        });
      }


      /**
       * Save this object
       *
       * @return {Promise}
       * @resolved {String} - The id of the doc
       */
      obj.save = function () {
        var body = {};

        _.forOwn(mapping, function (fieldMapping, fieldName) {
          if (obj[fieldName] != null) {
            body[fieldName] = (fieldMapping._serialize)
              ? fieldMapping._serialize(obj[fieldName])
              : obj[fieldName];
          }
        });

        if (obj.searchSource) {
          body.kibanaSavedObjectMeta = {
            searchSourceJSON: JSON.stringify(_.omit(obj.searchSource.toJSON(), ['sort', 'size']))
          };
        }


        // Slugify the object id
        obj.id = slugifyId(obj.id);

        // ensure that the docSource has the current obj.id
        docSource.id(obj.id);

        // index the document
        return obj.saveSource(body);
      };

      obj.saveSource = function (source) {
        return docSource.doIndex(source)
        .then(function (id) {
          obj.id = id;
        })
        .then(function () {
          return es.indices.refresh({
            index: configFile.kibanaIndex
          });
        })
        .then(function () {
          // ensure that the object has the potentially new id
          return obj.id;
        });
      };

      /**
       * Destroy this object
       *
       * @return {undefined}
       */
      obj.destroy = function () {
        docSource.cancelPending();
        if (obj.searchSource) obj.searchSource.cancelPending();
      };

      /**
       * Delete this object from Elasticsearch
       * @return {promise}
       */
      obj.delete = function () {
        return es.delete({
          index: configFile.kibanaIndex,
          type: type,
          id: this.id
        }).then(function () {
          return es.indices.refresh({
            index: configFile.kibanaIndex
          });
        });
      };

    }

    return SavedObject;
  };
});
