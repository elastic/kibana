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

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { SavedObjectNotFound, DuplicateField } from 'ui/errors';
import { fieldFormats } from 'ui/registry/field_formats';
import { expandShorthand } from 'ui/utils/mapping_setup';
import { toastNotifications } from 'ui/notify';
import { findObjectByTitle } from 'ui/saved_objects';

import { IndexPatternMissingIndices } from './errors';
import { getComputedFields } from './_get_computed_fields';
import { getRoutes } from './get_routes';
import { formatHitProvider } from './_format_hit';
import { FieldList } from './_field_list';
import { flattenHitWrapper } from './_flatten_hit';

const MAX_ATTEMPTS_TO_RESOLVE_CONFLICTS = 3;
const type = 'index-pattern';

export class IndexPattern {
  constructor(id, config, savedObjectsClient, patternCache, fieldsFetcher, getIds) {
    this._setId(id);
    this.config = config;
    this.savedObjectsClient = savedObjectsClient;
    this.patternCache = patternCache;
    this.fieldsFetcher = fieldsFetcher;
    this.getIds = getIds;

    this.metaFields = config.get('metaFields');
    this.shortDotsEnable = config.get('shortDots:enable');
    this.getComputedFields = getComputedFields.bind(this);

    this.flattenHit = flattenHitWrapper(this, this.metaFields);
    this.formatHit = formatHitProvider(this, fieldFormats.getDefaultInstance('string'));
    this.formatField = this.formatHit.formatField;

    const getConfig = cfg => config.get(cfg);
    function serializeFieldFormatMap(flat, format, field) {
      if (format) {
        flat[field] = format;
      }
    }

    function deserializeFieldFormatMap(mapping) {
      const FieldFormat = fieldFormats.byId[mapping.id];
      return FieldFormat && new FieldFormat(mapping.params, getConfig);
    }

    this.mapping = expandShorthand({
      title: 'text',
      timeFieldName: 'keyword',
      intervalName: 'keyword',
      fields: 'json',
      sourceFilters: 'json',
      fieldFormatMap: {
        type: 'text',
        _serialize(map = {}) {
          const serialized = _.transform(map, serializeFieldFormatMap);
          return _.isEmpty(serialized) ? undefined : JSON.stringify(serialized);
        },
        _deserialize(map = '{}') {
          return _.mapValues(JSON.parse(map), mapping => { return deserializeFieldFormatMap(mapping); });
        }
      },
      type: 'keyword',
      typeMeta: 'json',
    });
  }

  _setId(id) {
    this.id = id;
    return this;
  }

  _setVersion(version) {
    this.version = version;
    return this;
  }

  _initFields(input) {
    const oldValue = this.fields;
    const newValue = input || oldValue || [];
    this.fields = new FieldList(this, newValue);
  }

  async _indexFields(forceFieldRefresh = false) {
    if (!this.id) {
      return;
    }

    function isFieldRefreshRequired(indexPattern) {
      if (!indexPattern.fields) {
        return true;
      }

      return indexPattern.fields.every(field => {
        // See https://github.com/elastic/kibana/pull/8421
        const hasFieldCaps = ('aggregatable' in field) && ('searchable' in field);

        // See https://github.com/elastic/kibana/pull/11969
        const hasDocValuesFlag = ('readFromDocValues' in field);

        return !hasFieldCaps || !hasDocValuesFlag;
      });
    }

    if (forceFieldRefresh || isFieldRefreshRequired(this)) {
      await this.refreshFields();
    }

    this._initFields();
  }

  _updateFromElasticSearch(response, forceFieldRefresh = false) {
    if (!response.found) {
      throw new SavedObjectNotFound(
        type,
        this.id,
        '#/management/kibana/index_pattern',
      );
    }

    _.forOwn(this.mapping, (fieldMapping, name) => {
      if (!fieldMapping._deserialize) {
        return;
      }
      response._source[name] = fieldMapping._deserialize(response._source[name]);
    });

    // give index pattern all of the values in _source
    _.assign(this, response._source);

    if (!this.title) {
      this.title = this.id;
    }

    return this._indexFields(forceFieldRefresh);
  }

  get routes() {
    return getRoutes();
  }

  async init(forceFieldRefresh = false) {

    if (!this.id) {
      return this; // no id === no elasticsearch document
    }

    const savedObject = await this.savedObjectsClient.get(type, this.id);
    this._setVersion(savedObject._version);

    const response = {
      _id: savedObject.id,
      _type: savedObject.type,
      _source: _.cloneDeep(savedObject.attributes),
      found: savedObject._version ? true : false
    };
    // Do this before we attempt to update from ES since that call can potentially perform a save
    this.originalBody = this.prepBody();
    await this._updateFromElasticSearch(response, forceFieldRefresh);
    // Do it after to ensure we have the most up to date information
    this.originalBody = this.prepBody();

    return this;
  }

  // Get the source filtering configuration for that index.
  getSourceFiltering() {
    return {
      excludes: this.sourceFilters && this.sourceFilters.map(filter => filter.value) || []
    };
  }

  addScriptedField(name, script, type = 'string', lang) {
    const scriptedFields = this.getScriptedFields();
    const names = _.pluck(scriptedFields, 'name');

    if (_.contains(names, name)) {
      throw new DuplicateField(name);
    }

    this.fields.push({
      name: name,
      script: script,
      type: type,
      scripted: true,
      lang: lang
    });

    this.save();
  }

  removeScriptedField(name) {
    const fieldIndex = _.findIndex(this.fields, {
      name: name,
      scripted: true
    });

    if(fieldIndex > -1) {
      this.fields.splice(fieldIndex, 1);
      delete this.fieldFormatMap[name];
      return this.save();
    }
  }

  popularizeField(fieldName, unit = 1) {
    const field = _.get(this, ['fields', 'byName', fieldName]);
    if (!field) {
      return;
    }
    const count = Math.max((field.count || 0) + unit, 0);
    if (field.count === count) {
      return;
    }
    field.count = count;
    this.save();
  }

  getNonScriptedFields() {
    return _.where(this.fields, { scripted: false });
  }

  getScriptedFields() {
    return _.where(this.fields, { scripted: true });
  }

  isTimeBased() {
    return !!this.timeFieldName && (!this.fields || !!this.getTimeField());
  }

  isTimeNanosBased() {
    const timeField = this.getTimeField();
    return timeField && timeField.esTypes && timeField.esTypes.indexOf('date_nanos') !== -1;
  }

  isTimeBasedWildcard() {
    return this.isTimeBased() && this.isWildcard();
  }

  getTimeField() {
    if (!this.timeFieldName || !this.fields || !this.fields.byName) return;
    return this.fields.byName[this.timeFieldName];
  }

  isWildcard() {
    return _.includes(this.title, '*');
  }

  prepBody() {
    const body = {};

    // serialize json fields
    _.forOwn(this.mapping, (fieldMapping, fieldName) => {
      if (this[fieldName] != null) {
        body[fieldName] = (fieldMapping._serialize)
          ? fieldMapping._serialize(this[fieldName])
          : this[fieldName];
      }
    });

    // clear the indexPattern list cache
    this.getIds.clearCache();
    return body;
  }

  async create(allowOverride = false) {
    const _create = async (duplicateId) => {
      if (duplicateId) {
        const duplicatePattern = new IndexPattern(duplicateId,
          this.config,
          this.savedObjectsClient,
          this.patternCache,
          this.fieldsFetcher,
          this.getIds);
        await duplicatePattern.destroy();
      }

      const body = this.prepBody();
      const response = await this.savedObjectsClient.create(type, body, { id: this.id });

      this._setId(response.id);
      return response.id;
    };

    const potentialDuplicateByTitle = await findObjectByTitle(this.savedObjectsClient, type, this.title);
    // If there is potentially duplicate title, just create it
    if (!potentialDuplicateByTitle) {
      return await _create();
    }

    // We found a duplicate but we aren't allowing override, show the warn modal
    if (!allowOverride) {
      return false;
    }

    return await _create(potentialDuplicateByTitle.id);
  }

  save(saveAttempts = 0) {
    const body = this.prepBody();
    // What keys changed since they last pulled the index pattern
    const originalChangedKeys = Object.keys(body).filter(key => body[key] !== this.originalBody[key]);
    return this.savedObjectsClient.update(type, this.id, body, { version: this.version })
      .then(({ id, _version }) => {
        this._setId(id);
        this._setVersion(_version);
      })
      .catch(err => {
        if (_.get(err, 'res.status') === 409 && saveAttempts++ < MAX_ATTEMPTS_TO_RESOLVE_CONFLICTS) {
          const samePattern = new IndexPattern(this.id,
            this.config,
            this.savedObjectsClient,
            this.patternCache,
            this.fieldsFetcher,
            this.getIds);
          return samePattern.init()
            .then(() => {
              // What keys changed from now and what the server returned
              const updatedBody = samePattern.prepBody();

              // Build a list of changed keys from the server response
              // and ensure we ignore the key if the server response
              // is the same as the original response (since that is expected
              // if we made a change in that key)
              const serverChangedKeys = Object.keys(updatedBody).filter(key => {
                return updatedBody[key] !== body[key] && this.originalBody[key] !== updatedBody[key];
              });

              let unresolvedCollision = false;
              for (const originalKey of originalChangedKeys) {
                for (const serverKey of serverChangedKeys) {
                  if (originalKey === serverKey) {
                    unresolvedCollision = true;
                    break;
                  }
                }
              }

              if (unresolvedCollision) {
                const message = i18n.translate(
                  'common.ui.indexPattern.unableWriteLabel',
                  { defaultMessage: 'Unable to write index pattern! Refresh the page to get the most up to date changes for this index pattern.' } // eslint-disable-line max-len
                );
                toastNotifications.addDanger(message);
                throw err;
              }

              // Set the updated response on this object
              serverChangedKeys.forEach(key => {
                this[key] = samePattern[key];
              });

              this._setVersion(samePattern.version);

              // Clear cache
              this.patternCache.clear(this.id);

              // Try the save again
              return this.save(saveAttempts);
            });
        }
        throw err;
      });
  }

  async _fetchFields() {
    const fields = await this.fieldsFetcher.fetch(this);
    const scripted = this.getScriptedFields();
    const all = fields.concat(scripted);
    await this._initFields(all);
  }

  refreshFields() {
    return this._fetchFields()
      .then(() => this.save())
      .catch((err) => {
        // https://github.com/elastic/kibana/issues/9224
        // This call will attempt to remap fields from the matching
        // ES index which may not actually exist. In that scenario,
        // we still want to notify the user that there is a problem
        // but we do not want to potentially make any pages unusable
        // so do not rethrow the error here
        if (err instanceof IndexPatternMissingIndices) {
          toastNotifications.addDanger(err.message);
          return [];
        }

        toastNotifications.addError(err, {
          title: i18n.translate('common.ui.indexPattern.fetchFieldErrorTitle', {
            defaultMessage: 'Error fetching fields',
          }),
        });
        throw err;
      });
  }

  toJSON() {
    return this.id;
  }

  toString() {
    return '' + this.toJSON();
  }

  destroy() {
    this.patternCache.clear(this.id);
    return this.savedObjectsClient.delete(type, this.id);
  }
}
