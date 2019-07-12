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
import { i18n } from '@kbn/i18n';
import { AggConfig, VisState } from 'ui/vis';
import { aggTypeFilters } from 'ui/agg_types/filter';
import { IndexPattern } from 'ui/index_patterns';
import { aggTypes, AggParam, FieldParamType, AggType } from 'ui/agg_types';
import { aggTypeFieldFilters } from 'ui/agg_types/param_types/filter';
import { groupAggregationsBy } from '../default_editor_utils';
import { EditorConfig } from '../../config/types';
import { AggTypeState, AggParamsState } from './default_editor_agg_params_state';
import { AggParamEditorProps } from './default_editor_agg_param_props';

interface ParamInstanceBase {
  agg: AggConfig;
  editorConfig: EditorConfig;
  metricAggs: AggConfig[];
  state: VisState;
}

export interface ParamInstance extends ParamInstanceBase {
  aggParam: AggParam;
  indexedFields: FieldParamType[];
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
    let indexedFields: FieldParamType[] = [];
    let fields;

    if (agg.schema.hideCustomLabel && param.name === 'customLabel') {
      return;
    }
    // if field param exists, compute allowed fields
    if (param.type === 'field') {
      const availableFields = (param as FieldParamType).getAvailableFields(
        agg.getIndexPattern().fields
      );
      fields = aggTypeFieldFilters.filter(availableFields, param.type, agg);
      indexedFields = groupAggregationsBy(fields, 'type', 'displayName');
    }

    if (fields && !indexedFields.length && index > 0) {
      // don't draw the rest of the options if there are no indexed fields and it's an extra param (index > 0).
      return;
    }

    const type = param.advanced ? 'advanced' : 'basic';

    // show params with an editor component
    if (param.editorComponent) {
      params[type].push({
        agg,
        aggParam: param,
        editorConfig,
        indexedFields,
        paramEditor: param.editorComponent,
        metricAggs,
        state,
        value: agg.params[param.name],
      } as ParamInstance);
    }
  });

  return params;
}

function getError(agg: AggConfig, aggIsTooLow: boolean) {
  const errors = [];
  if (aggIsTooLow) {
    errors.push(
      i18n.translate('common.ui.vis.editors.aggParams.errors.aggWrongRunOrderErrorMessage', {
        defaultMessage: '"{schema}" aggs must run before all other buckets!',
        values: { schema: agg.schema.title },
      })
    );
  }
  if (agg.schema.deprecate) {
    errors.push(
      agg.schema.deprecateMessage
        ? agg.schema.deprecateMessage
        : i18n.translate('common.ui.vis.editors.aggParams.errors.schemaIsDeprecatedErrorMessage', {
            defaultMessage: '"{schema}" has been deprecated.',
            values: { schema: agg.schema.title },
          })
    );
  }

  return errors;
}

function getAggTypeOptions(agg: AggConfig, indexPattern: IndexPattern, groupName: string) {
  const aggTypeOptions = aggTypeFilters.filter(aggTypes.byType[groupName], indexPattern, agg);
  return groupAggregationsBy(aggTypeOptions, 'subtype');
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
  aggType: AggType,
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

export { getAggParamsToRender, getError, getAggTypeOptions, isInvalidParamsTouched };
