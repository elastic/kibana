/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import type { SerializableRecord } from '@kbn/utility-types';
import { Assign, Ensure } from '@kbn/utility-types';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ExpressionAstExpression, ExpressionAstArgument } from '@kbn/expressions-plugin/common';
import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import { ISearchOptions, ISearchSource } from '../../../public';

import { IAggType } from './agg_type';
import { writeParams } from './agg_params';
import { IAggConfigs } from './agg_configs';
import { parseTimeShift } from './utils';

/** @public **/
export type AggConfigSerialized = Ensure<
  {
    type: string;
    enabled?: boolean;
    id?: string;
    params?: {} | SerializableRecord;
    schema?: string;
  },
  SerializableRecord
>;

export type AggConfigOptions = Assign<AggConfigSerialized, { type: IAggType }>;

/**
 * @name AggConfig
 *
 * @description This class represents an aggregation, which is displayed in the left-hand nav of
 * the Visualize app.
 */

// TODO need to make a more explicit interface for this
export type IAggConfig = AggConfig;

export class AggConfig {
  /**
   * Ensure that all of the objects in the list have ids, the objects
   * and list are modified by reference.
   *
   * @param  {array[object]} list - a list of objects, objects can be anything really
   * @return {array} - the list that was passed in
   */
  static ensureIds(list: any[]) {
    const have: IAggConfig[] = [];
    const haveNot: AggConfigOptions[] = [];
    list.forEach(function (obj) {
      (obj.id ? have : haveNot).push(obj);
    });

    let nextId = AggConfig.nextId(have);
    haveNot.forEach(function (obj) {
      obj.id = String(nextId++);
    });

    return list;
  }

  /**
   * Calculate the next id based on the ids in this list
   *
   * @return {array} list - a list of objects with id properties
   */
  static nextId(list: IAggConfig[]) {
    return (
      1 +
      list.reduce(function (max, obj) {
        return Math.max(max, +obj.id || 0);
      }, 0)
    );
  }

  public aggConfigs: IAggConfigs;
  public id: string;
  public enabled: boolean;
  public params: any;
  public parent?: IAggConfigs;
  public brandNew?: boolean;
  public schema?: string;

  private __type: IAggType;
  private __typeDecorations: any;
  private subAggs: AggConfig[] = [];

  constructor(aggConfigs: IAggConfigs, opts: AggConfigOptions) {
    this.aggConfigs = aggConfigs;
    this.id = String(opts.id || AggConfig.nextId(aggConfigs.aggs as any));
    this.enabled = typeof opts.enabled === 'boolean' ? opts.enabled : true;

    // start with empty params so that checks in type/schema setters don't freak
    // because this.params is undefined
    this.params = {};

    // setters
    this.setType(opts.type);

    if (opts.schema) {
      this.schema = opts.schema;
    }

    // set the params to the values from opts, or just to the defaults
    this.setParams(opts.params || {});

    // @ts-ignore
    this.__type = this.__type;
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

    this.getAggParams().forEach((aggParam) => {
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

  hasTimeShift(): boolean {
    return Boolean(this.getParam('timeShift'));
  }

  getTimeShift(): undefined | moment.Duration {
    const rawTimeShift = this.getParam('timeShift');
    if (!rawTimeShift) return undefined;
    const parsedTimeShift = parseTimeShift(rawTimeShift);
    if (parsedTimeShift === 'invalid') {
      throw new Error(`could not parse time shift ${rawTimeShift}`);
    }
    if (parsedTimeShift === 'previous') {
      const timeShiftInterval = this.aggConfigs.getTimeShiftInterval();
      if (timeShiftInterval) {
        return timeShiftInterval;
      } else if (!this.aggConfigs.timeRange) {
        return;
      }
      const resolvedBounds = this.aggConfigs.getResolvedTimeRange()!;
      return moment.duration(moment(resolvedBounds.max).diff(resolvedBounds.min));
    }
    return parsedTimeShift;
  }

  write(aggs?: IAggConfigs) {
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
   *  @param {SearchSource} searchSource
   *  @param {ISearchOptions} options
   *  @return {Promise<undefined>}
   */
  onSearchRequestStart(searchSource: ISearchSource, options?: ISearchOptions) {
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
  toDsl(aggConfigs?: IAggConfigs) {
    if (this.type.hasNoDsl) return;
    const output = this.write(aggConfigs) as any;

    const configDsl = {} as any;
    if (!this.type.hasNoDslParams) {
      configDsl[this.type.dslName || this.type.name] = output.params;
    }

    // if the config requires subAggs, write them to the dsl as well
    if (this.subAggs.length) {
      if (!output.subAggs) output.subAggs = this.subAggs;
      else output.subAggs.push(...this.subAggs);
    }

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

  /**
   * @returns Returns a serialized representation of an AggConfig.
   */
  serialize(): AggConfigSerialized {
    const params = this.params;

    const outParams = _.transform(
      this.getAggParams(),
      (out: any, aggParam) => {
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
      params: outParams as SerializableRecord,
      ...(this.schema && { schema: this.schema }),
    };
  }

  /**
   * @deprecated Use serialize() instead.
   * @removeBy 8.1
   */
  toJSON(): AggConfigSerialized {
    return this.serialize();
  }

  /**
   * Returns a serialized field format for the field used in this agg.
   * This can be passed to fieldFormats.deserialize to get the field
   * format instance.
   *
   * @public
   */
  toSerializedFieldFormat():
    | {}
    | Ensure<SerializedFieldFormat<SerializableRecord>, SerializableRecord> {
    return this.type ? this.type.getSerializedFormat(this) : {};
  }

  /**
   * @returns Returns an ExpressionAst representing the this agg type.
   */
  toExpressionAst(): ExpressionAstExpression | undefined {
    const functionName = this.type && this.type.expressionName;
    const { type, ...rest } = this.serialize();
    if (!functionName || !rest.params) {
      // Return undefined - there is no matching expression function for this agg
      return;
    }

    // Go through each of the params and convert to an array of expression args.
    const params = Object.entries(rest.params).reduce((acc, [key, value]) => {
      const deserializedParam = this.getAggParams().find((p) => p.name === key);

      if (deserializedParam && deserializedParam.toExpressionAst) {
        // If the param provides `toExpressionAst`, we call it with the value
        const paramExpressionAst = deserializedParam.toExpressionAst(this.getParam(key));
        if (paramExpressionAst) {
          acc[key] = Array.isArray(paramExpressionAst) ? paramExpressionAst : [paramExpressionAst];
        }
      } else if (value && Array.isArray(value)) {
        // For array params which don't provide `toExpressionAst`, we stringify
        // if it's an array of objects, otherwise we keep it as-is
        const definedValues = value.filter(
          (v) => typeof v !== 'undefined' && v !== null
        ) as ExpressionAstArgument[];
        acc[key] =
          typeof definedValues[0] === 'object' ? [JSON.stringify(definedValues)] : definedValues;
      } else if (typeof value === 'object') {
        // For object params which don't provide `toExpressionAst`, we stringify
        acc[key] = [JSON.stringify(value)];
      } else if (typeof value !== 'undefined') {
        // Everything else just gets stored in an array if it is defined
        acc[key] = [value];
      }

      return acc;
    }, {} as Record<string, ExpressionAstArgument[]>);

    return {
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: functionName,
          arguments: {
            ...params,
            // Expression args which are provided to all functions
            id: [this.id],
            enabled: [this.enabled],
            ...(this.schema ? { schema: [this.schema] } : {}), // schema may be undefined
          },
        },
      ],
    };
  }

  getAggParams() {
    return [...(_.hasIn(this, 'type.params') ? this.type.params : [])];
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

  getResponseId() {
    return this.type.getResponseId(this);
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

  /**
   * Returns the bucket path containing the main value the agg will produce
   * (e.g. for sum of bytes it will point to the sum, for median it will point
   *  to the 50 percentile in the percentile multi value bucket)
   */
  getValueBucketPath() {
    return this.type.getValueBucketPath(this);
  }

  makeLabel(percentageMode = false) {
    if (this.params.customLabel) {
      return this.params.customLabel;
    }

    if (!this.type) return '';
    return percentageMode
      ? i18n.translate('data.search.aggs.percentageOfLabel', {
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

  fieldName() {
    const field = this.getField();
    return field ? field.name : '';
  }

  fieldIsTimeField() {
    const defaultTimeField = this.getIndexPattern()?.getTimeField?.()?.name;
    const defaultTimeFields = defaultTimeField ? [defaultTimeField] : [];
    const allTimeFields =
      this.aggConfigs.timeFields && this.aggConfigs.timeFields.length > 0
        ? this.aggConfigs.timeFields
        : defaultTimeFields;
    const currentFieldName = this.fieldName();
    return allTimeFields.includes(currentFieldName);
  }

  public get type() {
    return this.__type;
  }

  public set type(type) {
    if (this.__typeDecorations) {
      _.forOwn(this.__typeDecorations, (prop, name: string | undefined) => {
        // @ts-ignore
        delete this[name];
      });
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
      availableFields = fieldParam.getAvailableFields(this);
    }

    // clear out the previous params except for a few special ones
    this.setParams({
      // almost every agg has fields, so we try to persist that when type changes
      field: availableFields.find((field: any) => field.name === this.getField()),
    });
  }

  public setType(type: IAggType) {
    this.type = type;
  }
}
