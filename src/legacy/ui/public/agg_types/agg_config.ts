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
 * @name AggConfig
 *
 * @description This class represents an aggregation, which is displayed in the left-hand nav of
 * the Visualize app.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { npStart } from 'ui/new_platform';
import { SearchSourceContract, FetchOptions } from '../courier/types';
import { AggType } from './agg_type';
import { AggGroupNames } from '../vis/editors/default/agg_groups';
import { writeParams } from './agg_params';
import { AggConfigs } from './agg_configs';
import { Schema } from '../vis/editors/default/schemas';
import { ContentType, KBN_FIELD_TYPES } from '../../../../plugins/data/public';

export interface AggConfigOptions {
  enabled: boolean;
  type: string;
  params: any;
  id?: string;
  schema?: string;
}

const unknownSchema: Schema = {
  name: 'unknown',
  title: 'Unknown',
  hideCustomLabel: true,
  aggFilter: [],
  min: 1,
  max: 1,
  params: [],
  defaults: {},
  editor: false,
  group: AggGroupNames.Metrics,
};

const getTypeFromRegistry = (type: string): AggType => {
  // We need to inline require here, since we're having a cyclic dependency
  // from somewhere inside agg_types back to AggConfig.
  const aggTypes = require('../agg_types').aggTypes;
  const registeredType =
    aggTypes.metrics.find((agg: AggType) => agg.name === type) ||
    aggTypes.buckets.find((agg: AggType) => agg.name === type);

  if (!registeredType) {
    throw new Error('unknown type');
  }

  return registeredType;
};

const getSchemaFromRegistry = (schemas: any, schema: string): Schema => {
  let registeredSchema = schemas ? schemas.byName[schema] : null;
  if (!registeredSchema) {
    registeredSchema = Object.assign({}, unknownSchema);
    registeredSchema.name = schema;
  }

  return registeredSchema;
};

export class AggConfig {
  /**
   * Ensure that all of the objects in the list have ids, the objects
   * and list are modified by reference.
   *
   * @param  {array[object]} list - a list of objects, objects can be anything really
   * @return {array} - the list that was passed in
   */
  static ensureIds(list: AggConfig[]) {
    const have: AggConfig[] = [];
    const haveNot: AggConfig[] = [];
    list.forEach(function(obj) {
      (obj.id ? have : haveNot).push(obj);
    });

    let nextId = AggConfig.nextId(have);
    haveNot.forEach(function(obj) {
      obj.id = String(nextId++);
    });

    return list;
  }

  /**
   * Calculate the next id based on the ids in this list
   *
   * @return {array} list - a list of objects with id properties
   */
  static nextId(list: AggConfig[]) {
    return (
      1 +
      list.reduce(function(max, obj) {
        return Math.max(max, +obj.id || 0);
      }, 0)
    );
  }

  public aggConfigs: AggConfigs;
  public id: string;
  public enabled: boolean;
  public params: any;
  public parent?: AggConfigs;
  public brandNew?: boolean;

  private __schema: Schema;
  private __type: AggType;
  private __typeDecorations: any;
  private subAggs: AggConfig[] = [];

  constructor(aggConfigs: AggConfigs, opts: AggConfigOptions) {
    this.aggConfigs = aggConfigs;
    this.id = String(opts.id || AggConfig.nextId(aggConfigs.aggs as any));
    this.enabled = typeof opts.enabled === 'boolean' ? opts.enabled : true;

    // start with empty params so that checks in type/schema setters don't freak
    // because this.params is undefined
    this.params = {};

    // setters
    this.setType(opts.type);

    if (opts.schema) {
      this.setSchema(opts.schema);
    }

    // set the params to the values from opts, or just to the defaults
    this.setParams(opts.params || {});

    // @ts-ignore
    this.__type = this.__type;
    // @ts-ignore
    this.__schema = this.__schema;
  }

  /**
   * Write the current values to this.params, filling in the defaults as we go
   *
   * @param  {object} [from] - optional object to read values from,
   *                         used when initializing
   * @return {undefined}
   */
  setParams(from: any) {
    from = from || this.params || {};
    const to = (this.params = {} as any);

    this.getAggParams().forEach(aggParam => {
      let val = from[aggParam.name];

      if (val == null) {
        if (aggParam.default == null) return;

        if (!_.isFunction(aggParam.default)) {
          val = aggParam.default;
        } else {
          val = aggParam.default(this);
          if (val == null) return;
        }
      }

      if (aggParam.deserialize) {
        const isTyped = _.isFunction(aggParam.valueType);

        const isType = isTyped && val instanceof aggParam.valueType;
        const isObject = !isTyped && _.isObject(val);
        const isDeserialized = isType || isObject;

        if (!isDeserialized) {
          val = aggParam.deserialize(val, this);
        }

        to[aggParam.name] = val;
        return;
      }

      to[aggParam.name] = _.cloneDeep(val);
    });
  }

  getParam(key: string): any {
    return _.get(this.params, key);
  }

  write(aggs?: AggConfigs) {
    return writeParams<AggConfig>(this.type.params, this, aggs);
  }

  isFilterable() {
    return _.isFunction(this.type.createFilter);
  }

  createFilter(key: string, params = {}) {
    const createFilter = this.type.createFilter;

    if (!createFilter) {
      throw new TypeError(`The "${this.type.title}" aggregation does not support filtering.`);
    }

    const field = this.getField();
    const label = this.getFieldDisplayName();
    if (field && !field.filterable) {
      let message = `The "${label}" field can not be used for filtering.`;
      if (field.scripted) {
        message = `The "${label}" field is scripted and can not be used for filtering.`;
      }
      throw new TypeError(message);
    }

    return createFilter(this, key, params);
  }

  /**
   *  Hook for pre-flight logic, see AggType#onSearchRequestStart
   *  @param {Courier.SearchSource} searchSource
   *  @param {Courier.FetchOptions} options
   *  @return {Promise<undefined>}
   */
  onSearchRequestStart(searchSource: SearchSourceContract, options?: FetchOptions) {
    if (!this.type) {
      return Promise.resolve();
    }

    return Promise.all(
      this.type.params.map((param: any) =>
        param.modifyAggConfigOnSearchRequestStart(this, searchSource, options)
      )
    );
  }

  /**
   * Convert this aggConfig to its dsl syntax.
   *
   * Adds params and adhoc subaggs to a pojo, then returns it
   *
   * @param  {AggConfigs} aggConfigs - the config object to convert
   * @return {void|Object} - if the config has a dsl representation, it is
   *                         returned, else undefined is returned
   */
  toDsl(aggConfigs?: AggConfigs) {
    if (this.type.hasNoDsl) return;
    const output = this.write(aggConfigs) as any;

    const configDsl = {} as any;
    configDsl[this.type.dslName || this.type.name] = output.params;

    // if the config requires subAggs, write them to the dsl as well
    if (this.subAggs.length && !output.subAggs) output.subAggs = this.subAggs;
    if (output.subAggs) {
      const subDslLvl = configDsl.aggs || (configDsl.aggs = {});
      output.subAggs.forEach(function nestAdhocSubAggs(subAggConfig: any) {
        subDslLvl[subAggConfig.id] = subAggConfig.toDsl(aggConfigs);
      });
    }

    if (output.parentAggs) {
      const subDslLvl = configDsl.parentAggs || (configDsl.parentAggs = {});
      output.parentAggs.forEach(function nestAdhocSubAggs(subAggConfig: any) {
        subDslLvl[subAggConfig.id] = subAggConfig.toDsl(aggConfigs);
      });
    }

    return configDsl;
  }

  toJSON() {
    const params = this.params;

    const outParams = _.transform(
      this.getAggParams(),
      (out, aggParam) => {
        let val = params[aggParam.name];

        // don't serialize undefined/null values
        if (val == null) return;
        if (aggParam.serialize) val = aggParam.serialize(val, this);
        if (val == null) return;

        // to prevent accidental leaking, we will clone all complex values
        out[aggParam.name] = _.cloneDeep(val);
      },
      {}
    );

    return {
      id: this.id,
      enabled: this.enabled,
      type: this.type && this.type.name,
      schema: _.get(this, 'schema.name', this.schema),
      params: outParams,
    };
  }

  getAggParams() {
    return [
      ...(_.has(this, 'type.params') ? this.type.params : []),
      ...(_.has(this, 'schema.params') ? (this.schema as Schema).params : []),
    ];
  }

  getRequestAggs() {
    return (this.type && this.type.getRequestAggs(this)) || [this];
  }

  getResponseAggs() {
    return (this.type && this.type.getResponseAggs(this)) || [this];
  }

  getValue(bucket: any) {
    return this.type.getValue(this, bucket);
  }

  getKey(bucket: any, key?: string) {
    if (this.type.getKey) {
      return this.type.getKey(bucket, key, this);
    } else {
      return '';
    }
  }

  getFieldDisplayName() {
    const field = this.getField();

    return field ? field.displayName || this.fieldName() : '';
  }

  getField() {
    return this.params.field;
  }

  makeLabel(percentageMode = false) {
    if (this.params.customLabel) {
      return this.params.customLabel;
    }

    if (!this.type) return '';
    return percentageMode
      ? i18n.translate('common.ui.vis.aggConfig.percentageOfLabel', {
          defaultMessage: 'Percentage of {label}',
          values: { label: this.type.makeLabel(this) },
        })
      : `${this.type.makeLabel(this)}`;
  }

  getIndexPattern() {
    return this.aggConfigs.indexPattern;
  }

  getTimeRange() {
    return this.aggConfigs.timeRange;
  }

  fieldFormatter(contentType?: ContentType, defaultFormat?: any) {
    const format = this.type && this.type.getFormat(this);

    if (format) {
      return format.getConverterFor(contentType);
    }

    return this.fieldOwnFormatter(contentType, defaultFormat);
  }

  fieldOwnFormatter(contentType?: ContentType, defaultFormat?: any) {
    const fieldFormats = npStart.plugins.data.fieldFormats;
    const field = this.getField();
    let format = field && field.format;
    if (!format) format = defaultFormat;
    if (!format) format = fieldFormats.getDefaultInstance(KBN_FIELD_TYPES.STRING);
    return format.getConverterFor(contentType);
  }

  fieldName() {
    const field = this.getField();
    return field ? field.name : '';
  }

  fieldIsTimeField() {
    const indexPattern = this.getIndexPattern();
    if (!indexPattern) return false;
    // @ts-ignore
    const timeFieldName = indexPattern.timeFieldName;
    return timeFieldName && this.fieldName() === timeFieldName;
  }

  public get type() {
    return this.__type;
  }

  public set type(type) {
    if (this.__typeDecorations) {
      _.forOwn(
        this.__typeDecorations,
        function(prop, name: string | undefined) {
          // @ts-ignore
          delete this[name];
        },
        this
      );
    }

    if (type && _.isFunction(type.decorateAggConfig)) {
      this.__typeDecorations = type.decorateAggConfig();
      Object.defineProperties(this, this.__typeDecorations);
    }

    this.__type = type;
    let availableFields = [];

    const fieldParam = this.type && this.type.params.find((p: any) => p.type === 'field');

    if (fieldParam) {
      // @ts-ignore
      availableFields = fieldParam.getAvailableFields(this.getIndexPattern().fields);
    }

    // clear out the previous params except for a few special ones
    this.setParams({
      // split row/columns is "outside" of the agg, so don't reset it
      row: this.params.row,

      // almost every agg has fields, so we try to persist that when type changes
      field: availableFields.find((field: any) => field.name === this.getField()),
    });
  }

  public setType(type: string | AggType) {
    this.type = typeof type === 'string' ? getTypeFromRegistry(type) : type;
  }

  public get schema() {
    return this.__schema;
  }

  public set schema(schema) {
    this.__schema = schema;
  }

  public setSchema(schema: string | Schema) {
    this.schema =
      typeof schema === 'string' ? getSchemaFromRegistry(this.aggConfigs.schemas, schema) : schema;
  }
}
