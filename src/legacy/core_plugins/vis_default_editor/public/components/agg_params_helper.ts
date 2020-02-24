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

import { get, isEmpty } from 'lodash';

import { IndexPattern, IndexPatternField } from 'src/plugins/data/public';
import { VisState } from 'src/legacy/core_plugins/visualizations/public';
import { groupAndSortBy, ComboBoxGroupedOptions } from '../utils';
import { AggTypeState, AggParamsState } from './agg_params_state';
import { AggParamEditorProps } from './agg_param_props';
import { aggParamsMap } from './agg_params_map';
import {
  aggTypeFilters,
  aggTypeFieldFilters,
  aggTypes,
  IAggConfig,
  AggParam,
  IFieldParamType,
  IAggType,
} from '../legacy_imports';
import { EditorConfig } from './utils';

interface ParamInstanceBase {
  agg: IAggConfig;
  editorConfig: EditorConfig;
  metricAggs: IAggConfig[];
  state: VisState;
}

export interface ParamInstance extends ParamInstanceBase {
  aggParam: AggParam;
  indexedFields: ComboBoxGroupedOptions<IndexPatternField>;
  paramEditor: React.ComponentType<AggParamEditorProps<unknown>>;
  value: unknown;
}

function getAggParamsToRender({ agg, editorConfig, metricAggs, state }: ParamInstanceBase) {
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

  // build collection of agg params components
  paramsToRender.forEach((param: AggParam, index: number) => {
    let indexedFields: ComboBoxGroupedOptions<IndexPatternField> = [];
    let fields: IndexPatternField[];

    if (agg.schema.hideCustomLabel && param.name === 'customLabel') {
      return;
    }
    // if field param exists, compute allowed fields
    if (param.type === 'field') {
      const availableFields: IndexPatternField[] = (param as IFieldParamType).getAvailableFields(
        agg
      );
      fields = aggTypeFieldFilters.filter(availableFields, agg);
      indexedFields = groupAndSortBy(fields, 'type', 'name');

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
      paramEditor = get(aggParams, param.name) || get(aggParamsMap, ['common', param.type]);
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
      });
    }
  });

  return params;
}

function getAggTypeOptions(
  agg: IAggConfig,
  indexPattern: IndexPattern,
  groupName: string
): ComboBoxGroupedOptions<IAggType> {
  const aggTypeOptions = aggTypeFilters.filter((aggTypes as any)[groupName], indexPattern, agg);
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

  const invalidParams = Object.values(aggParams).filter(param => !param.valid);

  if (isEmpty(invalidParams)) {
    return false;
  }

  return invalidParams.every(param => param.touched);
}

export { getAggParamsToRender, getAggTypeOptions, isInvalidParamsTouched };
