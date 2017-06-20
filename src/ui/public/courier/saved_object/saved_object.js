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

import { SavedObjectNotFound } from 'ui/errors';
import MappingSetupProvider from 'ui/utils/mapping_setup';

import { SearchSourceProvider } from '../data_source/search_source';
import { getTitleAlreadyExists } from './get_title_already_exists';

/**
 * An error message to be used when the user rejects a confirm overwrite.
 * @type {string}
 */
const OVERWRITE_REJECTED = 'Overwrite confirmation was rejected';

/**
 * An error message to be used when the user rejects a confirm save with duplicate title.
 * @type {string}
 */
const SAVE_DUPLICATE_REJECTED = 'Save with duplicate title confirmation was rejected';

/**
 * Interval that saved objects are batched for
 * @type {integer}
 */
const COLLECTION_TIME = 200;

/**
 * @param error {Error} the error
 * @return {boolean}
 */
function isErrorNonFatal(error) {
  if (!error) return false;
  return error.message === OVERWRITE_REJECTED || error.message === SAVE_DUPLICATE_REJECTED;
}

export function SavedObjectProvider(esAdmin, kbnIndex, Promise, Private, Notifier, confirmModalPromise, indexPatterns, savedObjectsClient) {

  const SearchSource = Private(SearchSourceProvider);
  const mappingSetup = Private(MappingSetupProvider);

  let savedObjectsQueue = [];

  const throttledSavedObjectsBatch = _.throttle(() => {
    const queue = _.clone(savedObjectsQueue);
    savedObjectsQueue = [];

    savedObjectsClient.bulkGet(queue).then(({ savedObjects }) => {
      queue.forEach((item) => {
        const foundObject = savedObjects.find(savedObject => {
          return savedObject.id === item.id & savedObject.type === item.type;
        });

        if (!foundObject) {
          return item.reject(new SavedObjectNotFound(item.type, item.id));
        }

        item.resolve(_.cloneDeep(foundObject));
      });
    });
  }, COLLECTION_TIME, { leading: false });

  function SavedObject(config) {
    if (!_.isObject(config)) config = {};

    /************
     * Initialize config vars
     ************/

    // type name for this object, used as the ES-type
    const esType = config.type;
    this.index = kbnIndex;

    this.getDisplayName = function () {
      return esType;
    };

    // NOTE: this.type (not set in this file, but somewhere else) is the sub type, e.g. 'area' or
    // 'data table', while esType is the more generic type - e.g. 'visualization' or 'saved search'.
    this.getEsType = function () {
      return esType;
    };

    /**
     * Flips to true during a save operation, and back to false once the save operation
     * completes.
     * @type {boolean}
     */
    this.isSaving = false;
    this.defaults = config.defaults || {};

    // mapping definition for the fields that this object will expose
    const mapping = mappingSetup.expandShorthand(config.mapping);

    const afterESResp = config.afterESResp || _.noop;
    const customInit = config.init || _.noop;

    // optional search source which this object configures
    this.searchSource = config.searchSource ? new SearchSource() : undefined;

    // the id of the document
    this.id = config.id || void 0;

    // Whether to create a copy when the object is saved. This should eventually go away
    // in favor of a better rename/save flow.
    this.copyOnSave = false;

    const parseSearchSource = (searchSourceJson) => {
      if (!this.searchSource) return;

      // if we have a searchSource, set its state based on the searchSourceJSON field
      let state;
      try {
        state = JSON.parse(searchSourceJson);
      } catch (e) {
        state = {};
      }

      const oldState = this.searchSource.toJSON();
      const fnProps = _.transform(oldState, function (dynamic, val, name) {
        if (_.isFunction(val)) dynamic[name] = val;
      }, {});

      this.searchSource.set(_.defaults(state, fnProps));
    };

    const getSavedObjectsBatch = (type, id) => {
      return new Promise((resolve, reject) => {
        savedObjectsQueue.push({ type, id, resolve, reject });
        throttledSavedObjectsBatch();
      });
    };

    /**
     * After creation or fetching from ES, ensure that the searchSources index indexPattern
     * is an bonafide IndexPattern object.
     *
     * @return {Promise<IndexPattern | null>}
     */
    const hydrateIndexPattern = () => {
      if (!this.searchSource) {
        return Promise.resolve(null);
      }

      if (config.clearSavedIndexPattern) {
        this.searchSource.set('index', undefined);
        return Promise.resolve(null);
      }

      let index = config.indexPattern || this.searchSource.getOwn('index');

      if (!index) {
        return Promise.resolve(null);
      }

      // If index is not an IndexPattern object at this point, then it's a string id of an index.
      if (!(index instanceof indexPatterns.IndexPattern)) {
        index = indexPatterns.get(index);
      }

      // At this point index will either be an IndexPattern, if cached, or a promise that
      // will return an IndexPattern, if not cached.
      return Promise.resolve(index).then(indexPattern => {
        this.searchSource.set('index', indexPattern);
      });
    };

    /**
     * Asynchronously initialize this object - will only run
     * once even if called multiple times.
     *
     * @return {Promise}
     * @resolved {SavedObject}
     */
    this.init = _.once(() => {
      // ensure that the esType is defined
      if (!esType) throw new Error('You must define a type name to use SavedObject objects.');

      // check that the mapping for this esType is defined
      return mappingSetup.isDefined(esType)
        .then(function (defined) {
          // if it is already defined skip this step
          if (defined) return true;

          mapping.kibanaSavedObjectMeta = {
            properties: {
              // setup the searchSource mapping, even if it is not used but this type yet
              searchSourceJSON: {
                type: 'text'
              }
            }
          };

          // tell mappingSetup to set esType
          return mappingSetup.setup(esType, mapping);
        })
        .then(() => {
          // If there is not id, then there is no document to fetch from elasticsearch
          if (!this.id) {
            // just assign the defaults and be done
            _.assign(this, this.defaults);
            return hydrateIndexPattern().then(() => {
              return afterESResp.call(this);
            });
          }

          // fetch the object from ES
          return getSavedObjectsBatch(esType, this.id).then(this.applyESResp);

        })
        .then(() => {
          return customInit.call(this);
        })
        .then(() => {
          // return our obj as the result of init()
          return this;
        });
    });

    this.applyESResp = (resp) => {
      this._source = _.cloneDeep(resp._attributes);

      if (!resp._version) {
        throw new SavedObjectNotFound(esType, this.id);
      }

      const meta = _.get(resp, '_attributes.kibanaSavedObjectMeta', {});
      delete resp._attributes.kibanaSavedObjectMeta;

      if (!config.indexPattern && this._source.indexPattern) {
        config.indexPattern = this._source.indexPattern;
        delete this._source.indexPattern;
      }

      // assign the defaults to the response
      _.defaults(this._source, this.defaults);

      // transform the source using _deserializers
      _.forOwn(mapping, (fieldMapping, fieldName) => {
        if (fieldMapping._deserialize) {
          this._source[fieldName] = fieldMapping._deserialize(this._source[fieldName]);
        }
      });

      // Give obj all of the values in _source.fields
      _.assign(this, this._source);
      this.lastSavedTitle = this.title;

      return Promise.try(() => {
        parseSearchSource(meta.searchSourceJSON);
        return hydrateIndexPattern();
      }).then(() => {
        return Promise.cast(afterESResp.call(this, resp));
      });
    };

    /**
     * Serialize this object
     *
     * @return {Object}
     */
    this.serialize = () => {
      const body = {};

      _.forOwn(mapping, (fieldMapping, fieldName) => {
        if (this[fieldName] != null) {
          body[fieldName] = (fieldMapping._serialize)
            ? fieldMapping._serialize(this[fieldName])
            : this[fieldName];
        }
      });

      if (this.searchSource) {
        body.kibanaSavedObjectMeta = {
          searchSourceJSON: angular.toJson(_.omit(this.searchSource.toJSON(), ['sort', 'size']))
        };
      }

      return body;
    };

    /**
     * Returns true if the object's original title has been changed. New objects return false.
     * @return {boolean}
     */
    this.isTitleChanged = () => {
      return this._source && this._source.title !== this.title;
    };

    /**
     * Queries es to refresh the index.
     * @returns {Promise}
     */
    function refreshIndex() {
      return esAdmin.indices.refresh({ index: kbnIndex });
    }

    /**
     * Returns a promise that resolves to true if either the title is unique, or if the user confirmed they
     * wished to save the duplicate title.  Promise is rejected if the user rejects the confirmation.
     */
    const warnIfDuplicateTitle = () => {
      // Don't warn if the user isn't updating the title, otherwise that would become very annoying to have
      // to confirm the save every time, except when copyOnSave is true, then we do want to check.
      if (this.title === this.lastSavedTitle && !this.copyOnSave) {
        return Promise.resolve();
      }

      return getTitleAlreadyExists(this, savedObjectsClient)
        .then(duplicateTitle => {
          if (!duplicateTitle) return true;

          const confirmMessage =
            `A ${this.getDisplayName()} with the title '${duplicateTitle}' already exists. Would you like to save anyway?`;

          return confirmModalPromise(confirmMessage, { confirmButtonText: `Save ${this.getDisplayName()}` })
            .catch(() => Promise.reject(new Error(SAVE_DUPLICATE_REJECTED)));
        });
    };

    /**
     * Saves this object.
     *
     * @return {Promise}
     * @resolved {String} - The id of the doc
     */
    this.save = () => {
      // Save the original id in case the save fails.
      const originalId = this.id;
      // Read https://github.com/elastic/kibana/issues/9056 and
      // https://github.com/elastic/kibana/issues/9012 for some background into why this copyOnSave variable
      // exists.
      // The goal is to move towards a better rename flow, but since our users have been conditioned
      // to expect a 'save as' flow during a rename, we are keeping the logic the same until a better
      // UI/UX can be worked out.
      if (this.copyOnSave) {
        this.id = null;
      }

      const source = this.serialize();

      this.isSaving = true;

      return warnIfDuplicateTitle()
        .then(() => {
          if (this.id) {
            return savedObjectsClient.update(esType, this.id, source);
          } else {
            return savedObjectsClient.create(esType, source);
          }
        })
        .then((resp) => {
          this.id = resp.id;
        })
        .then(refreshIndex)
        .then(() => {
          this.isSaving = false;
          this.lastSavedTitle = this.title;
          return this.id;
        })
        .catch((err) => {
          this.isSaving = false;
          this.id = originalId;
          if (isErrorNonFatal(err)) {
            return;
          }
          return Promise.reject(err);
        });
    };

    this.destroy = () => {
      if (this.searchSource) {
        this.searchSource.cancelQueued();
      }
    };

    /**
     * Delete this object from Elasticsearch
     * @return {promise}
     */
    this.delete = () => {
      return esAdmin.delete(
        {
          index: kbnIndex,
          type: esType,
          id: this.id
        })
        .then(() => {
          return refreshIndex();
        });
    };
  }

  return SavedObject;
}
