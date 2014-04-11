define(function (require) {
  var module = require('modules').get('kibana/saved_object');
  var _ = require('lodash');

  module.factory('SavedObject', function (courier, configFile, Promise, createNotifier, $injector) {

    var mappingSetup = $injector.invoke(require('./_mapping_setup'));

    function SavedObject(config) {
      if (!_.isObject(config)) config = {};

      // save an easy reference to this
      var obj = this;

      /************
       * Initialize config vars
       ************/
      // the doc which is used to store this object
      var docSource = courier.createSource('doc');

      // type name for this object, used as the ES-type
      var type = config.type;

      // Create a notifier for sending alerts
      var notify = createNotifier({
        location: 'Saved ' + type
      });

      // mapping definition for the fields that this object
      // will expose, the actual mapping will place this under it's
      // "fields:" propety definition.
      var fieldMapping = config.mapping || {};

      // default field values, assigned when the source is loaded
      var defaults = config.defaults;

      // optional search source which this object configures
      obj.searchSource = config.searchSource && courier.createSource('search');

      // the id of the document
      obj.id = config.id || void 0;

      /**
       * Asynchronously initialize this object - will only run
       * once even if called multiple times.
       *
       * @return {Promise}
       * @resolved {SavedObject}
       */
      this.init = _.once(function () {
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

          // we need to setup the mapping, flesh it out first
          var mapping = {
            // wrap the mapping in a "fields" key, so that it won't collide
            // with things we add, like "searchSource"
            fields: {
              // allow shortcuts for the field types, by just setting the value
              // to the type name
              properties: _.mapValues(mapping, function (val, prop) {
                if (typeof val !== 'string') return val;
                return {
                  type: val
                };
              })
            },

            // setup the searchSource mapping, even if it is not used but this type yet
            searchSourceJSON: {
              type: 'string'
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
            return false;
          }

          // fetch the object from ES
          return docSource.fetch()
          .then(function applyDocSourceResp(resp) {
            if (!resp.found) throw new Error('Unable to find that ' + type + '.');

            // assign the defaults to the response
            _.defaults(resp._source.fields, defaults);

            // Give obj all of the values in _source.fields
            _.assign(obj, resp._source.fields);

            // if we have a searchSource, set it's state based on the searchSourceJSON field
            if (obj.searchSource) {
              var state = {};
              try {
                state = JSON.parse(resp._source.searchSourceJSON);
              } catch (e) {}
              obj.searchSource.set(state);
            }

            // Any time obj is updated, re-call applyDocSourceResp
            docSource.onUpdate().then(applyDocSourceResp, notify.fatal);
          });
        })
        .then(function () {
          // return our obj as the result of init()
          return obj;
        });
      });


      /**
       * Save this object
       *
       * @return {Promise}
       * @resolved {String} - The id of the doc
       */
      this.save = function () {
        var body = {
          fields: {}
        };

        _.forOwn(fieldMapping, function (mapping, fieldName) {
          if (obj[fieldName] != null) {
            body.fields[fieldName] = obj[fieldName];
          }
        });

        if (obj.searchSource) {
          body.searchSourceJSON = JSON.stringify(obj.searchSource);
        }

        return docSource.doIndex(body).then(function (id) {
          obj.id = id;
          return id;
        });
      };

      /**
       * Destroy this object
       *
       * @return {undefined}
       */
      this.destroy = function () {
        docSource.cancelPending();
      };

    }

    return SavedObject;
  });
});