/**
 * @name SavedObject
 *
 * NOTE: SavedObject seems to track a reference to an object in ES,
 * and surface methods for CRUD functionality (save and delete). This seems
 * similar to how Backbone Models work.
 *
 * This class seems to interface with ES primarily through the es Angular
 * service and a DocSource instance.
 */

import angular from 'angular';
import _ from 'lodash';

import errors from 'ui/errors';
import uuid from 'node-uuid';
import MappingSetupProvider from 'ui/utils/mapping_setup';

import DocSourceProvider from '../data_source/doc_source';
import SearchSourceProvider from '../data_source/search_source';

export default function SavedObjectFactory(es, kbnIndex, Promise, Private, Notifier, safeConfirm, indexPatterns) {

  let DocSource = Private(DocSourceProvider);
  let SearchSource = Private(SearchSourceProvider);
  let mappingSetup = Private(MappingSetupProvider);

  function SavedObject(config) {
    if (!_.isObject(config)) config = {};

    // save an easy reference to this
    let self = this;

    /************
     * Initialize config vars
     ************/
    // the doc which is used to store this object
    let docSource = new DocSource();

    // type name for this object, used as the ES-type
    const type = config.type;

    self.getDisplayName = function () {
      return type;
    };

    /**
     * Flips to true during a save operation, and back to false once the save operation
     * completes.
     * @type {boolean}
     */
    self.isSaving = false;
    self.defaults = config.defaults || {};

    // Create a notifier for sending alerts
    let notify = new Notifier({
      location: 'Saved ' + type
    });

    // mapping definition for the fields that this object will expose
    let mapping = mappingSetup.expandShorthand(config.mapping);

    let afterESResp = config.afterESResp || _.noop;
    let customInit = config.init || _.noop;

    // optional search source which this object configures
    self.searchSource = config.searchSource ? new SearchSource() : undefined;

    // the id of the document
    self.id = config.id || void 0;

    // Whether to create a copy when the object is saved. This should eventually go away
    // in favor of a better rename/save flow.
    self.copyOnSave = false;

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
        .index(kbnIndex)
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
          _.assign(self, self.defaults);
          return hydrateIndexPattern().then(() => {
            return afterESResp.call(self);
          });
        }

        // fetch the object from ES
        return docSource.fetch().then(self.applyESResp);
      })
      .then(function () {
        return customInit.call(self);
      })
      .then(function () {
        // return our obj as the result of init()
        return self;
      });
    });

    self.applyESResp = function (resp) {
      self._source = _.cloneDeep(resp._source);

      if (resp.found != null && !resp.found) throw new errors.SavedObjectNotFound(type, self.id);

      let meta = resp._source.kibanaSavedObjectMeta || {};
      delete resp._source.kibanaSavedObjectMeta;

      if (!config.indexPattern && self._source.indexPattern) {
        config.indexPattern = self._source.indexPattern;
        delete self._source.indexPattern;
      }

      // assign the defaults to the response
      _.defaults(self._source, self.defaults);

      // transform the source using _deserializers
      _.forOwn(mapping, function ittr(fieldMapping, fieldName) {
        if (fieldMapping._deserialize) {
          self._source[fieldName] = fieldMapping._deserialize(self._source[fieldName], resp, fieldName, fieldMapping);
        }
      });

      // Give obj all of the values in _source.fields
      _.assign(self, self._source);
      self.lastSavedTitle = self.title;

      return Promise.try(() => {
        parseSearchSource(meta.searchSourceJSON);
        return hydrateIndexPattern();
      })
      .then(() => {
        return Promise.cast(afterESResp.call(self, resp));
      })
      .then(() => {
        // Any time obj is updated, re-call applyESResp
        docSource.onUpdate().then(self.applyESResp, notify.fatal);
      });
    };

    function parseSearchSource(searchSourceJson) {
      if (!self.searchSource) return;

      // if we have a searchSource, set its state based on the searchSourceJSON field
      let state;
      try {
        state = JSON.parse(searchSourceJson);
      } catch (e) {
        state = {};
      }

      let oldState = self.searchSource.toJSON();
      let fnProps = _.transform(oldState, function (dynamic, val, name) {
        if (_.isFunction(val)) dynamic[name] = val;
      }, {});

      self.searchSource.set(_.defaults(state, fnProps));
    }

    /**
     * After creation or fetching from ES, ensure that the searchSources index indexPattern
     * is an bonafide IndexPattern object.
     *
     * @return {Promise<IndexPattern | null>}
     */
    function hydrateIndexPattern() {
      if (!self.searchSource) { return Promise.resolve(null); }

      if (config.clearSavedIndexPattern) {
        self.searchSource.set('index', undefined);
        return Promise.resolve(null);
      }

      let index = config.indexPattern || self.searchSource.getOwn('index');

      if (!index) { return Promise.resolve(null); }

      // If index is not an IndexPattern object at this point, then it's a string id of an index.
      if (!(index instanceof indexPatterns.IndexPattern)) {
        index = indexPatterns.get(index);
      }

      // At this point index will either be an IndexPattern, if cached, or a promise that
      // will return an IndexPattern, if not cached.
      return Promise.resolve(index)
        .then((indexPattern) => {
          self.searchSource.set('index', indexPattern);
        });
    }

    /**
     * Serialize this object
     *
     * @return {Object}
     */
    self.serialize = function () {
      let body = {};

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

      return body;
    };

    /**
     * Returns true if the object's original title has been changed. New objects return false.
     * @return {boolean}
     */
    self.isTitleChanged = function () {
      return self._source && self._source.title !== self.title;
    };

    /**
     * Saves this object.
     *
     * @return {Promise}
     * @resolved {String} - The id of the doc
     */
    self.save = function () {
      // Save the original id in case the save fails.
      let originalId = self.id;
      // Read https://github.com/elastic/kibana/issues/9056 and
      // https://github.com/elastic/kibana/issues/9012 for some background into why this copyOnSave variable
      // exists.
      // The goal is to move towards a better rename flow, but since our users have been conditioned
      // to expect a 'save as' flow during a rename, we are keeping the logic the same until a better
      // UI/UX can be worked out.
      if (this.copyOnSave) {
        self.id = null;
      }

      // Create a unique id for this object if it doesn't have one already.
      self.id = this.id || uuid.v1();
      // ensure that the docSource has the current id
      docSource.id(self.id);

      let source = self.serialize();

      self.isSaving = true;
      return docSource.doIndex(source)
        .then((id) => { self.id = id; })
        .then(self.refreshIndex)
        .then(() => {
          self.isSaving = false;
          self.lastSavedTitle = self.title;
          return self.id;
        })
        .catch(function (err) {
          self.isSaving = false;
          self.id = originalId;
          return Promise.reject(err);
        });
    };

    self.destroy = function () {
      docSource.cancelQueued();
      if (self.searchSource) {
        self.searchSource.cancelQueued();
      }
    };

    /**
     * Queries es to refresh the index.
     * @returns {Promise}
     */
    self.refreshIndex = function () {
      return es.indices.refresh({ index: kbnIndex });
    };

    /**
     * Delete this object from Elasticsearch
     * @return {promise}
     */
    self.delete = function () {
      return es.delete(
        {
          index: kbnIndex,
          type: type,
          id: this.id
        })
        .then(() => { return this.refreshIndex(); });
    };
  }

  return SavedObject;
};
