define(function (require) {
  return function SavedObjectFactory(es, configFile, Promise, Private, Notifier, indexPatterns) {
    var angular = require('angular');
    var errors = require('errors');
    var _ = require('lodash');
    var slugifyId = require('utils/slugify_id');

    var DocSource = Private(require('components/courier/data_source/doc_source'));
    var SearchSource = Private(require('components/courier/data_source/search_source'));
    var mappingSetup = Private(require('utils/mapping_setup'));

    function SavedObject(config) {
      if (!_.isObject(config)) config = {};

      // save an easy reference to this
      var self = this;

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
      self.searchSource = config.searchSource && new SearchSource();

      // the id of the document
      self.id = config.id || void 0;

      /**
       * Asynchronously initialize this object - will only run
       * once even if called multiple times.
       *
       * @return {Promise}
       * @resolved {SavedObject}
       */
      self.init = _.once(function () {
        // ensure that the type is defined
        if (!type) throw new Error('You must define a type name to use SavedObject objects.');

        // tell the docSource where to find the doc
        docSource
        .index(configFile.kibana_index)
        .type(type)
        .id(self.id);

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
          if (!self.id) {
            // just assign the defaults and be done
            _.assign(self, defaults);
            return hydrateIndexPattern().then(function () {
              return afterESResp.call(self);
            });
          }

          // fetch the object from ES
          return docSource.fetch()
          .then(function applyESResp(resp) {

            self._source = _.cloneDeep(resp._source);

            if (!resp.found) throw new errors.SavedObjectNotFound(type, self.id);

            var meta = resp._source.kibanaSavedObjectMeta || {};
            delete resp._source.kibanaSavedObjectMeta;

            if (!config.indexPattern && self._source.indexPattern) {
              config.indexPattern = self._source.indexPattern;
              delete self._source.indexPattern;
            }

            // assign the defaults to the response
            _.defaults(self._source, defaults);

            // transform the source using _deserializers
            _.forOwn(mapping, function ittr(fieldMapping, fieldName) {
              if (fieldMapping._deserialize) {
                self._source[fieldName] = fieldMapping._deserialize(self._source[fieldName], resp, fieldName, fieldMapping);
              }
            });

            // Give obj all of the values in _source.fields
            _.assign(self, self._source);

            return Promise.try(function () {
              // if we have a searchSource, set it's state based on the searchSourceJSON field
              if (self.searchSource) {
                var state = {};
                try {
                  state = JSON.parse(meta.searchSourceJSON);
                } catch (e) {}

                var oldState = self.searchSource.toJSON();
                var fnProps = _.transform(oldState, function (dynamic, val, name) {
                  if (_.isFunction(val)) dynamic[name] = val;
                }, {});

                self.searchSource.set(_.defaults(state, fnProps));
              }
            })
            .then(hydrateIndexPattern)
            .then(function () {
              return Promise.cast(afterESResp.call(self, resp));
            })
            .then(function () {
              // Any time obj is updated, re-call applyESResp
              docSource.onUpdate().then(applyESResp, notify.fatal);
            });
          });
        })
        .then(function () {
          return customInit.call(self);
        })
        .then(function () {
          // return our obj as the result of init()
          return self;
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
          if (self.searchSource) {

            var index = config.indexPattern || self.searchSource.getOwn('index');
            if (!index) return;
            if (config.clearSavedIndexPattern) {
              self.searchSource.set('index', undefined);
              return;
            }

            if (!(index instanceof indexPatterns.IndexPattern)) {
              index = indexPatterns.get(index);
            }

            return Promise.resolve(index).then(function (indexPattern) {
              self.searchSource.set('index', indexPattern);
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
      self.save = function () {
        var body = {};

        _.forOwn(mapping, function (fieldMapping, fieldName) {
          if (self[fieldName] != null) {
            body[fieldName] = (fieldMapping._serialize)
              ? fieldMapping._serialize(self[fieldName])
              : self[fieldName];
          }
        });

        if (self.searchSource) {
          body.kibanaSavedObjectMeta = {
            searchSourceJSON: angular.toJson(_.omit(self.searchSource.toJSON(), ['sort', 'size']))
          };
        }


        // Slugify the object id
        self.id = slugifyId(self.id);

        // ensure that the docSource has the current self.id
        docSource.id(self.id);

        // index the document
        return self.saveSource(body);
      };

      self.saveSource = function (source) {
        var finish = function (id) {
          self.id = id;
          return es.indices.refresh({
            index: configFile.kibana_index
          })
          .then(function () {
            return self.id;
          });
        };
        return docSource.doCreate(source)
        .then(finish)
        .catch(function (err) {
          var confirmMessage = 'Are you sure you want to overwrite this?';
          if (_.deepGet(err, 'origError.status') === 409 && window.confirm(confirmMessage)) {
            return docSource.doIndex(source).then(finish);
          }
          return Promise.reject(err);
        });
      };

      /**
       * Destroy this object
       *
       * @return {undefined}
       */
      self.destroy = function () {
        docSource.cancelQueued();
        if (self.searchSource) {
          self.searchSource.cancelQueued();
        }
      };

      /**
       * Delete this object from Elasticsearch
       * @return {promise}
       */
      self.delete = function () {
        return es.delete({
          index: configFile.kibana_index,
          type: type,
          id: this.id
        }).then(function () {
          return es.indices.refresh({
            index: configFile.kibana_index
          });
        });
      };

    }

    return SavedObject;
  };
});
