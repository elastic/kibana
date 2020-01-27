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

import _, { each, reject } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { SavedObjectsClientContract } from 'src/core/public';
import {
  DuplicateField,
  SavedObjectNotFound,
  expandShorthand,
  FieldMappingSpec,
  MappingObject,
} from '../../../../kibana_utils/public';
import { toMountPoint } from '../../../../kibana_react/public';

import { ES_FIELD_TYPES, KBN_FIELD_TYPES, IIndexPattern, IFieldType } from '../../../common';

import { findByTitle, getRoutes } from '../utils';
import { indexPatterns } from '../';
import { Field, FieldList, IFieldList } from '../fields';
import { createFieldsFetcher } from './_fields_fetcher';
import { formatHitProvider } from './format_hit';
import { flattenHitWrapper } from './flatten_hit';
import { IIndexPatternsApiClient } from './index_patterns_api_client';
import { getNotifications, getFieldFormats, getHttp } from '../../services';

const MAX_ATTEMPTS_TO_RESOLVE_CONFLICTS = 3;
const type = 'index-pattern';

export class IndexPattern implements IIndexPattern {
  [key: string]: any;

  public id?: string;
  public title: string = '';
  public type?: string;
  public fieldFormatMap: any;
  public typeMeta: any;
  public fields: IFieldList;
  public timeFieldName: string | undefined;
  public intervalName: string | undefined | null;
  public formatHit: any;
  public formatField: any;
  public flattenHit: any;
  public metaFields: string[];

  private version: string | undefined;
  private savedObjectsClient: SavedObjectsClientContract;
  private patternCache: any;
  private getConfig: any;
  private sourceFilters?: [];
  private originalBody: { [key: string]: any } = {};
  private fieldsFetcher: any;
  private shortDotsEnable: boolean = false;

  private mapping: MappingObject = expandShorthand({
    title: ES_FIELD_TYPES.TEXT,
    timeFieldName: ES_FIELD_TYPES.KEYWORD,
    intervalName: ES_FIELD_TYPES.KEYWORD,
    fields: 'json',
    sourceFilters: 'json',
    fieldFormatMap: {
      type: ES_FIELD_TYPES.TEXT,
      _serialize: (map = {}) => {
        const serialized = _.transform(map, this.serializeFieldFormatMap);
        return _.isEmpty(serialized) ? undefined : JSON.stringify(serialized);
      },
      _deserialize: (map = '{}') => {
        return _.mapValues(JSON.parse(map), mapping => {
          return this.deserializeFieldFormatMap(mapping);
        });
      },
    },
    type: ES_FIELD_TYPES.KEYWORD,
    typeMeta: 'json',
  });

  constructor(
    id: string | undefined,
    getConfig: any,
    savedObjectsClient: SavedObjectsClientContract,
    apiClient: IIndexPatternsApiClient,
    patternCache: any
  ) {
    this.id = id;
    this.savedObjectsClient = savedObjectsClient;
    this.patternCache = patternCache;
    // instead of storing config we rather store the getter only as np uiSettingsClient has circular references
    // which cause problems when being consumed from angular
    this.getConfig = getConfig;

    this.shortDotsEnable = this.getConfig('shortDots:enable');
    this.metaFields = this.getConfig('metaFields');

    this.fields = new FieldList(this, [], this.shortDotsEnable);
    this.fieldsFetcher = createFieldsFetcher(this, apiClient, this.getConfig('metaFields'));
    this.flattenHit = flattenHitWrapper(this, this.getConfig('metaFields'));
    this.formatHit = formatHitProvider(
      this,
      getFieldFormats().getDefaultInstance(KBN_FIELD_TYPES.STRING)
    );
    this.formatField = this.formatHit.formatField;
  }

  private serializeFieldFormatMap(flat: any, format: string, field: string | undefined) {
    if (format && field) {
      flat[field] = format;
    }
  }

  private deserializeFieldFormatMap(mapping: any) {
    const FieldFormat = getFieldFormats().getType(mapping.id);

    return FieldFormat && new FieldFormat(mapping.params, this.getConfig);
  }

  private initFields(input?: any) {
    const newValue = input || this.fields;

    this.fields = new FieldList(this, newValue, this.shortDotsEnable);
  }

  private isFieldRefreshRequired(): boolean {
    if (!this.fields) {
      return true;
    }

    return this.fields.every(field => {
      // See https://github.com/elastic/kibana/pull/8421
      const hasFieldCaps = 'aggregatable' in field && 'searchable' in field;

      // See https://github.com/elastic/kibana/pull/11969
      const hasDocValuesFlag = 'readFromDocValues' in field;

      return !hasFieldCaps || !hasDocValuesFlag;
    });
  }

  private async indexFields(forceFieldRefresh: boolean = false) {
    if (!this.id) {
      return;
    }

    if (forceFieldRefresh || this.isFieldRefreshRequired()) {
      await this.refreshFields();
    }

    this.initFields();
  }

  private async updateFromElasticSearch(response: any, forceFieldRefresh: boolean = false) {
    if (!response.found) {
      throw new SavedObjectNotFound(type, this.id, '#/management/kibana/index_pattern');
    }

    _.forOwn(this.mapping, (fieldMapping: FieldMappingSpec, name: string | undefined) => {
      if (!fieldMapping._deserialize || !name) {
        return;
      }

      response._source[name] = fieldMapping._deserialize(response._source[name]);
    });

    // give index pattern all of the values in _source
    _.assign(this, response._source);

    if (!this.title && this.id) {
      this.title = this.id;
    }

    if (this.isUnsupportedTimePattern()) {
      const warningTitle = i18n.translate('data.indexPatterns.warningTitle', {
        defaultMessage: 'Support for time interval index patterns removed',
      });

      const warningText = i18n.translate('data.indexPatterns.warningText', {
        defaultMessage:
          'Currently querying all indices matching {index}. {title} should be migrated to a wildcard-based index pattern.',
        values: {
          title: this.title,
          index: this.getIndex(),
        },
      });

      // kbnUrl was added to this service in #35262 before it was de-angularized, and merged in a PR
      // directly against the 7.x branch. Index patterns were de-angularized in #39247, and in order
      // to preserve the functionality from #35262 we need to get the injector here just for kbnUrl.
      // This has all been removed as of 8.0.

      // 2019-12-01 The usage of kbnUrl had to be removed due to the transition to NP.
      // It's now temporarily replaced by a simple replace of the single argument used by all URLs.
      // Once kbnUrl is migrated to NP, this can be updated.
      const editUrlTemplate = getRoutes().edit;
      const editUrl = '/app/kibana#' + editUrlTemplate.replace('{{id}}', this.id!);

      const { toasts } = getNotifications();

      toasts.addWarning({
        title: warningTitle,
        text: toMountPoint(
          <div>
            <p>{warningText}</p>
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButton size="s" href={getHttp().basePath.prepend(editUrl)}>
                  <FormattedMessage
                    id="data.indexPatterns.editIndexPattern"
                    defaultMessage="Edit index pattern"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        ),
      });
    }

    return this.indexFields(forceFieldRefresh);
  }

  public get routes() {
    return getRoutes();
  }

  getComputedFields() {
    const scriptFields: any = {};
    if (!this.fields) {
      return {
        storedFields: ['*'],
        scriptFields,
        docvalueFields: [],
      };
    }

    // Date value returned in "_source" could be in any number of formats
    // Use a docvalue for each date field to ensure standardized formats when working with date fields
    // indexPattern.flattenHit will override "_source" values when the same field is also defined in "fields"
    const docvalueFields = reject(this.fields.getByType('date'), 'scripted').map(
      (dateField: any) => {
        return {
          field: dateField.name,
          format:
            dateField.esTypes && dateField.esTypes.indexOf('date_nanos') !== -1
              ? 'strict_date_time'
              : 'date_time',
        };
      }
    );

    each(this.getScriptedFields(), function(field) {
      scriptFields[field.name] = {
        script: {
          source: field.script,
          lang: field.lang,
        },
      };
    });

    return {
      storedFields: ['*'],
      scriptFields,
      docvalueFields,
    };
  }

  async init(forceFieldRefresh = false) {
    if (!this.id) {
      return this; // no id === no elasticsearch document
    }

    const savedObject = await this.savedObjectsClient.get(type, this.id);
    this.version = savedObject._version;

    const response = {
      _id: savedObject.id,
      _type: savedObject.type,
      _source: _.cloneDeep(savedObject.attributes),
      found: savedObject._version ? true : false,
    };
    // Do this before we attempt to update from ES since that call can potentially perform a save
    this.originalBody = this.prepBody();
    await this.updateFromElasticSearch(response, forceFieldRefresh);
    // Do it after to ensure we have the most up to date information
    this.originalBody = this.prepBody();

    return this;
  }

  migrate(newTitle: string) {
    return this.savedObjectsClient
      .update(type, this.id!, {
        title: newTitle,
        intervalName: null,
      })
      .then(({ attributes: { title, intervalName } }) => {
        this.title = title;
        this.intervalName = intervalName;
      })
      .then(() => this);
  }

  // Get the source filtering configuration for that index.
  getSourceFiltering() {
    return {
      excludes: (this.sourceFilters && this.sourceFilters.map((filter: any) => filter.value)) || [],
    };
  }

  async addScriptedField(name: string, script: string, fieldType: string = 'string', lang: string) {
    const scriptedFields = this.getScriptedFields();
    const names = _.pluck(scriptedFields, 'name');

    if (_.contains(names, name)) {
      throw new DuplicateField(name);
    }

    this.fields.add(
      new Field(
        this,
        {
          name,
          script,
          fieldType,
          scripted: true,
          lang,
          aggregatable: true,
          filterable: true,
          searchable: true,
        },
        false
      )
    );

    await this.save();
  }

  removeScriptedField(field: IFieldType) {
    this.fields.remove(field);
    return this.save();
  }

  async popularizeField(fieldName: string, unit = 1) {
    const field = this.fields.getByName(fieldName);
    if (!field) {
      return;
    }
    const count = Math.max((field.count || 0) + unit, 0);
    if (field.count === count) {
      return;
    }
    field.count = count;
    await this.save();
  }

  getNonScriptedFields() {
    return _.where(this.fields, { scripted: false });
  }

  getScriptedFields() {
    return _.where(this.fields, { scripted: true });
  }

  getIndex() {
    if (!this.isUnsupportedTimePattern()) {
      return this.title;
    }

    // Take a time-based interval index pattern title (like [foo-]YYYY.MM.DD[-bar]) and turn it
    // into the actual index (like foo-*-bar) by replacing anything not inside square brackets
    // with a *.
    const regex = /\[[^\]]*]/g; // Matches text inside brackets
    const splits = this.title.split(regex); // e.g. ['', 'YYYY.MM.DD', ''] from the above example
    const matches = this.title.match(regex) || []; // e.g. ['[foo-]', '[-bar]'] from the above example
    return splits
      .map((split, i) => {
        const match = i >= matches.length ? '' : matches[i].replace(/[\[\]]/g, '');
        return `${split.length ? '*' : ''}${match}`;
      })
      .join('');
  }

  isUnsupportedTimePattern(): boolean {
    return !!this.intervalName;
  }

  isTimeBased(): boolean {
    return !!this.timeFieldName && (!this.fields || !!this.getTimeField());
  }

  isTimeNanosBased(): boolean {
    const timeField: any = this.getTimeField();
    return timeField && timeField.esTypes && timeField.esTypes.indexOf('date_nanos') !== -1;
  }

  isTimeBasedWildcard(): boolean {
    return this.isTimeBased() && this.isWildcard();
  }

  getTimeField() {
    if (!this.timeFieldName || !this.fields || !this.fields.getByName) return;
    return this.fields.getByName(this.timeFieldName);
  }

  getFieldByName(name: string): Field | void {
    if (!this.fields || !this.fields.getByName) return;
    return this.fields.getByName(name);
  }

  isWildcard() {
    return _.includes(this.title, '*');
  }

  prepBody() {
    const body: { [key: string]: any } = {};

    // serialize json fields
    _.forOwn(this.mapping, (fieldMapping, fieldName) => {
      if (!fieldName || this[fieldName] == null) return;

      body[fieldName] = fieldMapping._serialize
        ? fieldMapping._serialize(this[fieldName])
        : this[fieldName];
    });

    return body;
  }

  async create(allowOverride: boolean = false) {
    const _create = async (duplicateId?: string) => {
      if (duplicateId) {
        const duplicatePattern = new IndexPattern(
          duplicateId,
          this.getConfig,
          this.savedObjectsClient,
          this.patternCache,
          this.fieldsFetcher
        );
        await duplicatePattern.destroy();
      }

      const body = this.prepBody();
      const response = await this.savedObjectsClient.create(type, body, { id: this.id });

      this.id = response.id;
      return response.id;
    };

    const potentialDuplicateByTitle = await findByTitle(this.savedObjectsClient, this.title);
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

  async save(saveAttempts: number = 0): Promise<void | Error> {
    if (!this.id) return;
    const body = this.prepBody();
    // What keys changed since they last pulled the index pattern
    const originalChangedKeys = Object.keys(body).filter(
      key => body[key] !== this.originalBody[key]
    );
    return this.savedObjectsClient
      .update(type, this.id, body, { version: this.version })
      .then((resp: any) => {
        this.id = resp.id;
        this.version = resp._version;
      })
      .catch(err => {
        if (
          _.get(err, 'res.status') === 409 &&
          saveAttempts++ < MAX_ATTEMPTS_TO_RESOLVE_CONFLICTS
        ) {
          const samePattern = new IndexPattern(
            this.id,
            this.getConfig,
            this.savedObjectsClient,
            this.patternCache,
            this.fieldsFetcher
          );
          return samePattern.init().then(() => {
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
              const message = i18n.translate('data.indexPatterns.unableWriteLabel', {
                defaultMessage:
                  'Unable to write index pattern! Refresh the page to get the most up to date changes for this index pattern.',
              });
              const { toasts } = getNotifications();

              toasts.addDanger(message);

              throw err;
            }

            // Set the updated response on this object
            serverChangedKeys.forEach(key => {
              this[key] = samePattern[key];
            });
            this.version = samePattern.version;

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
    await this.initFields(all);
  }

  refreshFields() {
    return this._fetchFields()
      .then(() => this.save())
      .catch(err => {
        // https://github.com/elastic/kibana/issues/9224
        // This call will attempt to remap fields from the matching
        // ES index which may not actually exist. In that scenario,
        // we still want to notify the user that there is a problem
        // but we do not want to potentially make any pages unusable
        // so do not rethrow the error here
        const { toasts } = getNotifications();

        if (err instanceof indexPatterns.IndexPatternMissingIndices) {
          toasts.addDanger((err as any).message);

          return [];
        }

        toasts.addError(err, {
          title: i18n.translate('data.indexPatterns.fetchFieldErrorTitle', {
            defaultMessage: 'Error fetching fields for index pattern {title} (ID: {id})',
            values: {
              id: this.id,
              title: this.title,
            },
          }),
        });
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
    if (this.id) {
      return this.savedObjectsClient.delete(type, this.id);
    }
  }
}
