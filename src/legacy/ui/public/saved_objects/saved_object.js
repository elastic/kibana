/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * @name SavedObject
 *
 * NOTE: SavedObject seems to track a reference to an object in ES,
 * and surface methods for CRUD functionality (save and delete). This seems
 * similar to how Backbone Models work.
 *
 * This class seems to interface with ES primarily through the es Angular
 * service and the saved object api.
 */

import angular from 'angular';
import _ from 'lodash';

import { InvalidJSONProperty, SavedObjectNotFound } from '../../../../plugins/kibana_utils/public';
import { expandShorthand } from '../utils/mapping_setup';

import { SearchSourceProvider } from '../courier/search_source';
import { findObjectByTitle } from './find_object_by_title';
import { SavedObjectsClientProvider } from './saved_objects_client_provider';
import { migrateLegacyQuery } from '../utils/migrate_legacy_query';
import { npStart } from 'ui/new_platform';
import { i18n } from '@kbn/i18n';

/**
 * An error message to be used when the user rejects a confirm overwrite.
 * @type {string}
 */
const OVERWRITE_REJECTED = i18n.translate('common.ui.savedObjects.overwriteRejectedDescription', {
  defaultMessage: 'Overwrite confirmation was rejected',
});

/**
 * An error message to be used when the user rejects a confirm save with duplicate title.
 * @type {string}
 */
const SAVE_DUPLICATE_REJECTED = i18n.translate(
  'common.ui.savedObjects.saveDuplicateRejectedDescription',
  {
    defaultMessage: 'Save with duplicate title confirmation was rejected',
  }
);

/**
 * @param error {Error} the error
 * @return {boolean}
 */
function isErrorNonFatal(error) {
  if (!error) return false;
  return error.message === OVERWRITE_REJECTED || error.message === SAVE_DUPLICATE_REJECTED;
}

export function SavedObjectProvider(Promise, Private, confirmModalPromise, indexPatterns) {
  const savedObjectsClient = Private(SavedObjectsClientProvider);
  const SearchSource = Private(SearchSourceProvider);

  /**
   * The SavedObject class is a base class for saved objects loaded from the server and
   * provides additional functionality besides loading/saving/deleting/etc.
   *
   * It is overloaded and configured to provide type-aware functionality.
   * To just retrieve the attributes of saved objects, it is recommended to use SavedObjectLoader
   * which returns instances of SimpleSavedObject which don't introduce additional type-specific complexity.
   * @param {*} config
   */
  function SavedObject(config) {
    if (!_.isObject(config)) config = {};

    /************
     * Initialize config vars
     ************/

    // type name for this object, used as the ES-type
    const esType = config.type;

    this.getDisplayName = function() {
      return esType;
    };

    // NOTE: this.type (not set in this file, but somewhere else) is the sub type, e.g. 'area' or
    // 'data table', while esType is the more generic type - e.g. 'visualization' or 'saved search'.
    this.getEsType = function() {
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
    const mapping = expandShorthand(config.mapping);

    const afterESResp = config.afterESResp || _.noop;
    const customInit = config.init || _.noop;
    const extractReferences = config.extractReferences;
    const injectReferences = config.injectReferences;

    // optional search source which this object configures
    this.searchSource = config.searchSource ? new SearchSource() : undefined;

    // the id of the document
    this.id = config.id || void 0;

    // the migration version of the document, should only be set on imports
    this.migrationVersion = config.migrationVersion;

    // Whether to create a copy when the object is saved. This should eventually go away
    // in favor of a better rename/save flow.
    this.copyOnSave = false;

    const parseSearchSource = (searchSourceJson, references) => {
      if (!this.searchSource) return;

      // if we have a searchSource, set its values based on the searchSourceJson field
      let searchSourceValues;
      try {
        searchSourceValues = JSON.parse(searchSourceJson);
      } catch (e) {
        throw new InvalidJSONProperty(
          `Invalid JSON in ${esType} "${this.id}". ${e.message} JSON: ${searchSourceJson}`
        );
      }

      // This detects a scenario where documents with invalid JSON properties have been imported into the saved object index.
      // (This happened in issue #20308)
      if (!searchSourceValues || typeof searchSourceValues !== 'object') {
        throw new InvalidJSONProperty(`Invalid searchSourceJSON in ${esType} "${this.id}".`);
      }

      // Inject index id if a reference is saved
      if (searchSourceValues.indexRefName) {
        const reference = references.find(
          reference => reference.name === searchSourceValues.indexRefName
        );
        if (!reference) {
          throw new Error(
            `Could not find reference for ${
              searchSourceValues.indexRefName
            } on ${this.getEsType()} ${this.id}`
          );
        }
        searchSourceValues.index = reference.id;
        delete searchSourceValues.indexRefName;
      }

      if (searchSourceValues.filter) {
        searchSourceValues.filter.forEach(filterRow => {
          if (!filterRow.meta || !filterRow.meta.indexRefName) {
            return;
          }
          const reference = references.find(
            reference => reference.name === filterRow.meta.indexRefName
          );
          if (!reference) {
            throw new Error(
              `Could not find reference for ${filterRow.meta.indexRefName} on ${this.getEsType()}`
            );
          }
          filterRow.meta.index = reference.id;
          delete filterRow.meta.indexRefName;
        });
      }

      const searchSourceFields = this.searchSource.getFields();
      const fnProps = _.transform(
        searchSourceFields,
        function(dynamic, val, name) {
          if (_.isFunction(val)) dynamic[name] = val;
        },
        {}
      );

      this.searchSource.setFields(_.defaults(searchSourceValues, fnProps));

      if (!_.isUndefined(this.searchSource.getOwnField('query'))) {
        this.searchSource.setField(
          'query',
          migrateLegacyQuery(this.searchSource.getOwnField('query'))
        );
      }
    };

    /**
     * After creation or fetching from ES, ensure that the searchSources index indexPattern
     * is an bonafide IndexPattern object.
     *
     * @return {Promise<IndexPattern | null>}
     */
    this.hydrateIndexPattern = id => {
      if (!this.searchSource) {
        return Promise.resolve(null);
      }

      if (config.clearSavedIndexPattern) {
        this.searchSource.setField('index', null);
        return Promise.resolve(null);
      }

      let index = id || config.indexPattern || this.searchSource.getOwnField('index');

      if (!index) {
        return Promise.resolve(null);
      }

      // If index is not an IndexPattern object at this point, then it's a string id of an index.
      if (typeof index === 'string') {
        index = indexPatterns.get(index);
      }

      // At this point index will either be an IndexPattern, if cached, or a promise that
      // will return an IndexPattern, if not cached.
      return Promise.resolve(index).then(indexPattern => {
        this.searchSource.setField('index', indexPattern);
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

      return Promise.resolve()
        .then(() => {
          // If there is not id, then there is no document to fetch from elasticsearch
          if (!this.id) {
            // just assign the defaults and be done
            _.assign(this, this.defaults);
            return this.hydrateIndexPattern().then(() => {
              return afterESResp.call(this);
            });
          }

          // fetch the object from ES
          return savedObjectsClient
            .get(esType, this.id)
            .then(resp => {
              // temporary compatability for savedObjectsClient
              return {
                _id: resp.id,
                _type: resp.type,
                _source: _.cloneDeep(resp.attributes),
                references: resp.references,
                found: resp._version ? true : false,
              };
            })
            .then(this.applyESResp)
            .catch(this.applyEsResp);
        })
        .then(() => customInit.call(this))
        .then(() => this);
    });

    this.applyESResp = resp => {
      this._source = _.cloneDeep(resp._source);

      if (resp.found != null && !resp.found) {
        throw new SavedObjectNotFound(esType, this.id);
      }

      const meta = resp._source.kibanaSavedObjectMeta || {};
      delete resp._source.kibanaSavedObjectMeta;

      if (!config.indexPattern && this._source.indexPattern) {
        config.indexPattern = this._source.indexPattern;
        delete this._source.indexPattern;
      }

      // assign the defaults to the response
      _.defaults(this._source, this.defaults);

      // transform the source using _deserializers
      _.forOwn(mapping, (fieldMapping, fieldName) => {
        if (fieldMapping._deserialize) {
          this._source[fieldName] = fieldMapping._deserialize(
            this._source[fieldName],
            resp,
            fieldName,
            fieldMapping
          );
        }
      });

      // Give obj all of the values in _source.fields
      _.assign(this, this._source);
      this.lastSavedTitle = this.title;

      return Promise.try(() => {
        parseSearchSource(meta.searchSourceJSON, resp.references);
        return this.hydrateIndexPattern();
      })
        .then(() => {
          if (injectReferences && resp.references && resp.references.length > 0) {
            injectReferences(this, resp.references);
          }
          return this;
        })
        .then(() => {
          return Promise.cast(afterESResp.call(this, resp));
        });
    };

    /**
     * Serialize this object
     *
     * @return {Object}
     */
    this._serialize = () => {
      const attributes = {};
      const references = [];

      _.forOwn(mapping, (fieldMapping, fieldName) => {
        if (this[fieldName] != null) {
          attributes[fieldName] = fieldMapping._serialize
            ? fieldMapping._serialize(this[fieldName])
            : this[fieldName];
        }
      });

      if (this.searchSource) {
        let searchSourceFields = _.omit(this.searchSource.getFields(), ['sort', 'size']);
        if (searchSourceFields.index) {
          // searchSourceFields.index will normally be an IndexPattern, but can be a string in two scenarios:
          // (1) `init()` (and by extension `hydrateIndexPattern()`) hasn't been called on this Saved Object
          // (2) The IndexPattern doesn't exist, so we fail to resolve it in `hydrateIndexPattern()`
          const indexId =
            typeof searchSourceFields.index === 'string'
              ? searchSourceFields.index
              : searchSourceFields.index.id;
          const refName = 'kibanaSavedObjectMeta.searchSourceJSON.index';
          references.push({
            name: refName,
            type: 'index-pattern',
            id: indexId,
          });
          searchSourceFields = {
            ...searchSourceFields,
            indexRefName: refName,
            index: undefined,
          };
        }
        if (searchSourceFields.filter) {
          searchSourceFields = {
            ...searchSourceFields,
            filter: searchSourceFields.filter.map((filterRow, i) => {
              if (!filterRow.meta || !filterRow.meta.index) {
                return filterRow;
              }
              const refName = `kibanaSavedObjectMeta.searchSourceJSON.filter[${i}].meta.index`;
              references.push({
                name: refName,
                type: 'index-pattern',
                id: filterRow.meta.index,
              });
              return {
                ...filterRow,
                meta: {
                  ...filterRow.meta,
                  indexRefName: refName,
                  index: undefined,
                },
              };
            }),
          };
        }
        attributes.kibanaSavedObjectMeta = {
          searchSourceJSON: angular.toJson(searchSourceFields),
        };
      }

      return { attributes, references };
    };

    /**
     * Returns true if the object's original title has been changed. New objects return false.
     * @return {boolean}
     */
    this.isTitleChanged = () => {
      return this._source && this._source.title !== this.title;
    };

    this.creationOpts = (opts = {}) => ({
      id: this.id,
      migrationVersion: this.migrationVersion,
      ...opts,
    });

    /**
     * Attempts to create the current object using the serialized source. If an object already
     * exists, a warning message requests an overwrite confirmation.
     * @param source - serialized version of this object (return value from this._serialize())
     * What will be indexed into elasticsearch.
     * @param options - options to pass to the saved object create method
     * @returns {Promise} - A promise that is resolved with the objects id if the object is
     * successfully indexed. If the overwrite confirmation was rejected, an error is thrown with
     * a confirmRejected = true parameter so that case can be handled differently than
     * a create or index error.
     * @resolved {SavedObject}
     */
    const createSource = (source, options = {}) => {
      return savedObjectsClient.create(esType, source, options).catch(err => {
        // record exists, confirm overwriting
        if (_.get(err, 'res.status') === 409) {
          const confirmMessage = i18n.translate(
            'common.ui.savedObjects.confirmModal.overwriteConfirmationMessage',
            {
              defaultMessage: 'Are you sure you want to overwrite {title}?',
              values: { title: this.title },
            }
          );

          return confirmModalPromise(confirmMessage, {
            confirmButtonText: i18n.translate(
              'common.ui.savedObjects.confirmModal.overwriteButtonLabel',
              {
                defaultMessage: 'Overwrite',
              }
            ),
            title: i18n.translate('common.ui.savedObjects.confirmModal.overwriteTitle', {
              defaultMessage: 'Overwrite {name}?',
              values: { name: this.getDisplayName() },
            }),
          })
            .then(() =>
              savedObjectsClient.create(
                esType,
                source,
                this.creationOpts({ overwrite: true, ...options })
              )
            )
            .catch(() => Promise.reject(new Error(OVERWRITE_REJECTED)));
        }
        return Promise.reject(err);
      });
    };

    const displayDuplicateTitleConfirmModal = () => {
      const confirmMessage = i18n.translate(
        'common.ui.savedObjects.confirmModal.saveDuplicateConfirmationMessage',
        {
          defaultMessage: `A {name} with the title '{title}' already exists. Would you like to save anyway?`,
          values: { title: this.title, name: this.getDisplayName() },
        }
      );

      return confirmModalPromise(confirmMessage, {
        confirmButtonText: i18n.translate(
          'common.ui.savedObjects.confirmModal.saveDuplicateButtonLabel',
          {
            defaultMessage: 'Save {name}',
            values: { name: this.getDisplayName() },
          }
        ),
      }).catch(() => Promise.reject(new Error(SAVE_DUPLICATE_REJECTED)));
    };

    const checkForDuplicateTitle = (isTitleDuplicateConfirmed, onTitleDuplicate) => {
      // Don't check for duplicates if user has already confirmed save with duplicate title
      if (isTitleDuplicateConfirmed) {
        return Promise.resolve();
      }

      // Don't check if the user isn't updating the title, otherwise that would become very annoying to have
      // to confirm the save every time, except when copyOnSave is true, then we do want to check.
      if (this.title === this.lastSavedTitle && !this.copyOnSave) {
        return Promise.resolve();
      }

      return findObjectByTitle(savedObjectsClient, this.getEsType(), this.title).then(duplicate => {
        if (!duplicate) return true;
        if (duplicate.id === this.id) return true;

        if (onTitleDuplicate) {
          onTitleDuplicate();
          return Promise.reject(new Error(SAVE_DUPLICATE_REJECTED));
        }

        // TODO: make onTitleDuplicate a required prop and remove UI components from this class
        // Need to leave here until all users pass onTitleDuplicate.
        return displayDuplicateTitleConfirmModal();
      });
    };

    /**
     * Saves this object.
     *
     * @param {object} [options={}]
     * @property {boolean} [options.confirmOverwrite=false] - If true, attempts to create the source so it
     * can confirm an overwrite if a document with the id already exists.
     * @property {boolean} [options.isTitleDuplicateConfirmed=false] - If true, save allowed with duplicate title
     * @property {func} [options.onTitleDuplicate] - function called if duplicate title exists.
     * When not provided, confirm modal will be displayed asking user to confirm or cancel save.
     * @return {Promise}
     * @resolved {String} - The id of the doc
     */
    this.save = ({
      confirmOverwrite = false,
      isTitleDuplicateConfirmed = false,
      onTitleDuplicate,
    } = {}) => {
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

      // Here we want to extract references and set them within "references" attribute
      let { attributes, references } = this._serialize();
      if (extractReferences) {
        ({ attributes, references } = extractReferences({ attributes, references }));
      }
      if (!references) throw new Error('References not returned from extractReferences');

      this.isSaving = true;

      return checkForDuplicateTitle(isTitleDuplicateConfirmed, onTitleDuplicate)
        .then(() => {
          if (confirmOverwrite) {
            return createSource(attributes, this.creationOpts({ references }));
          } else {
            return savedObjectsClient.create(
              esType,
              attributes,
              this.creationOpts({ references, overwrite: true })
            );
          }
        })
        .then(resp => {
          this.id = resp.id;
        })
        .then(() => {
          if (this.showInRecentlyAccessed && this.getFullPath) {
            npStart.core.chrome.recentlyAccessed.add(this.getFullPath(), this.title, this.id);
          }
          this.isSaving = false;
          this.lastSavedTitle = this.title;
          return this.id;
        })
        .catch(err => {
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
      return savedObjectsClient.delete(esType, this.id);
    };
  }

  return SavedObject;
}
