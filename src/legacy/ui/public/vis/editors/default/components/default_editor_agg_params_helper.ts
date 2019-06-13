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

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { AggConfig, Vis } from 'ui/vis';
import { aggTypeFieldFilters } from '../../../../agg_types/param_types/filter';
import { groupAggregationsBy } from '../default_editor_utils';

function getAggParamsToRender(
  agg: AggConfig,
  editorConfig: any,
  vis: Vis,
  responseValueAggs: any,
  aggParams: any,
  onChangeAggParams: any
) {
  const params = {
    basic: [] as any,
    advanced: [] as any,
  };

  const paramsToRender =
    (agg.type &&
      agg.type.params
        // Filter out, i.e. don't render, any parameter that is hidden via the editor config.
        .filter((param: any) => !get(editorConfig, [param.name, 'hidden'], false))) ||
    [];
  paramsToRender.forEach((param: any, i: number) => {
    let indexedFields: any = [];

    if (agg.schema.hideCustomLabel && param.name === 'customLabel') {
      return;
    }
    // if field param exists, compute allowed fields
    if (param.type === 'field') {
      const availableFields = param.getAvailableFields(agg.getIndexPattern().fields);
      const fields = aggTypeFieldFilters.filter(availableFields, param.type, agg, vis);
      indexedFields = groupAggregationsBy(fields, 'type', 'displayName');
    }

    if (indexedFields.length && i > 0) {
      // don't draw the rest of the options if there are no indexed fields.
      return;
    }

    const type = param.advanced ? 'advanced' : 'basic';

    if (param.editorComponent) {
      const aggParam = aggParams[param.name] || {};
      params[type].push({
        aggParam: param,
        paramEditor: param.editorComponent,
        indexedFields,
        onChange: (value: any) =>
          onChangeAggParams({ type: 'agg_params_value', paramName: param.name, value }),
        setValidity: (validity: boolean) =>
          onChangeAggParams({ type: 'agg_params_validity', paramName: param.name, validity }),
        setTouched: () =>
          onChangeAggParams({ type: 'agg_params_touched', paramName: param.name, touched: true }),
        agg,
        config: {},
        editorConfig,
        showValidation: aggParam.touched ? !aggParam.validity : false,
        value: aggParam.value,
        visName: vis.type.name,
        responseValueAggs,
      } as any);
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
  if (agg.error) {
    errors.push(agg.error);
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

export { getAggParamsToRender, getError };
