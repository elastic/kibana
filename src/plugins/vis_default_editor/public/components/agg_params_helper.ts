/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get, isEmpty } from 'lodash';

import {
  IAggConfig,
  AggParam,
  IFieldParamType,
  IAggType,
  IndexPattern,
  IndexPatternField,
} from '../../../data/public';
import type { Schema } from '../../../visualizations/public';

import { filterAggTypes, filterAggTypeFields } from '../agg_filters';
import { groupAndSortBy, ComboBoxGroupedOptions } from '../utils';
import { AggTypeState, AggParamsState } from './agg_params_state';
import { AggParamEditorProps } from './agg_param_props';
import { aggParamsMap } from './agg_params_map';
import { EditorConfig } from './utils';
import { getSchemaByName } from '../schemas';
import { EditorVisState } from './sidebar/state/reducers';

interface ParamInstanceBase {
  agg: IAggConfig;
  editorConfig: EditorConfig;
  metricAggs: IAggConfig[];
  state: EditorVisState;
  schemas: Schema[];
  hideCustomLabel?: boolean;
}

export interface ParamInstance extends ParamInstanceBase {
  aggParam: AggParam;
  indexedFields: ComboBoxGroupedOptions<IndexPatternField>;
  paramEditor: React.ComponentType<AggParamEditorProps<unknown>>;
  value: unknown;
}

function getAggParamsToRender({
  agg,
  editorConfig,
  metricAggs,
  state,
  schemas,
  hideCustomLabel,
}: ParamInstanceBase) {
  const params = {
    basic: [] as ParamInstance[],
    advanced: [] as ParamInstance[],
  };

  const paramsToRender =
    (agg.type &&
      agg.type.params
        // Filter out, i.e. don't render, any parameter that is hidden via the editor config.
        .filter((param: AggParam) => !get(editorConfig, [param.name, 'hidden'], false))) ||
    [];

  const schema = getSchemaByName(schemas, agg.schema);
  // build collection of agg params components
  paramsToRender.forEach((param: AggParam, index: number) => {
    let indexedFields: ComboBoxGroupedOptions<IndexPatternField> = [];
    let fields: IndexPatternField[];

    if (hideCustomLabel && param.name === 'customLabel') {
      return;
    }
    // if field param exists, compute allowed fields
    if (param.type === 'field') {
      let availableFields: IndexPatternField[] = (param as IFieldParamType).getAvailableFields(agg);
      // should be refactored in the future to provide a more general way
      // for visualization to override some agg config settings
      if (agg.type.name === 'top_hits' && param.name === 'field') {
        const allowStrings = get(schema, `aggSettings[${agg.type.name}].allowStrings`, false);
        if (!allowStrings) {
          availableFields = availableFields.filter((field) => field.type === 'number');
        }
      }
      fields = filterAggTypeFields(availableFields, agg);
      indexedFields = groupAndSortBy(fields, 'type', 'displayName', 'name');

      if (fields && !indexedFields.length && index > 0) {
        // don't draw the rest of the options if there are no indexed fields and it's an extra param (index > 0).
        return;
      }
    }

    const type = param.advanced ? 'advanced' : 'basic';

    let paramEditor: ParamInstance['paramEditor'];

    if (agg.type.subtype && aggParamsMap[agg.type.subtype]) {
      paramEditor = get(aggParamsMap, [agg.type.subtype, param.name]);
    } else {
      const aggType = agg.type.type;
      const aggName = agg.type.name;
      const aggParams = get(aggParamsMap, [aggType, aggName], {});
      paramEditor = get(aggParams, param.name);
    }

    if (!paramEditor) {
      paramEditor = get(aggParamsMap, ['common', param.type]);
    }

    // show params with an editor component
    if (paramEditor) {
      params[type].push({
        agg,
        aggParam: param,
        editorConfig,
        indexedFields,
        paramEditor,
        metricAggs,
        state,
        value: agg.params[param.name],
        schemas,
        hideCustomLabel,
      });
    }
  });

  return params;
}

function getAggTypeOptions(
  aggTypes: any,
  agg: IAggConfig,
  indexPattern: IndexPattern,
  groupName: string,
  allowedAggs: string[]
): ComboBoxGroupedOptions<IAggType> {
  const aggTypeOptions = filterAggTypes(aggTypes[groupName], indexPattern, agg, allowedAggs);
  return groupAndSortBy(aggTypeOptions as any[], 'subtype', 'title');
}

/**
 * Calculates a ngModel touched state.
 * If an aggregation is not selected, it returns a value of touched agg selector state.
 * Else if there are no invalid agg params, it returns false.
 * Otherwise it returns true if each invalid param is touched.
 * @param aggType Selected aggregation.
 * @param aggTypeState State of aggregation selector.
 * @param aggParams State of aggregation parameters.
 */
function isInvalidParamsTouched(
  aggType: IAggType,
  aggTypeState: AggTypeState,
  aggParams: AggParamsState
) {
  if (!aggType) {
    return aggTypeState.touched;
  }

  const invalidParams = Object.values(aggParams).filter((param) => !param.valid);

  if (isEmpty(invalidParams)) {
    return false;
  }

  return invalidParams.every((param) => param.touched);
}

function buildAggDescription(agg: IAggConfig) {
  let description = '';
  if (agg.type && agg.type.makeLabel) {
    try {
      description = agg.type.makeLabel(agg);
    } catch (e) {
      // Date Histogram's `makeLabel` implementation invokes 'write' method for each param, including interval's 'write',
      // which throws an error when interval is undefined.
    }
  }
  return description;
}

export { getAggParamsToRender, getAggTypeOptions, isInvalidParamsTouched, buildAggDescription };
