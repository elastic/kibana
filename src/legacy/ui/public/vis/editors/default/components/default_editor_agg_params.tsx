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
import { get, has } from 'lodash';
import React, { useReducer, useEffect } from 'react';

import { EuiForm, EuiAccordion, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AggType } from 'ui/agg_types';
import { AggConfig } from 'ui/vis/agg_config';
import { DefaultEditorAggSelect } from './default_editor_agg_select';
import { aggTypeFilters } from '../../../../agg_types/filter';
import { aggTypes } from '../../../../agg_types';
import { groupAggregationsBy } from '../default_editor_utils';
import { editorConfigProviders } from '../../config/editor_config_providers';
import { aggTypeFieldFilters } from '../../../../agg_types/param_types/filter';
import { Vis } from '../../../../vis';
import { AggParamReactWrapper } from '../agg_param_react_wrapper';

function reducer(state: any, action: any) {
  switch (action.type) {
    case 'agg_selector':
      return { ...state, value: action.value };
    case 'agg_selector_touched':
      return { ...state, touched: action.touched };
    case 'agg_selector_validity':
      return { ...state, validity: action.validity };
    default:
      throw new Error();
  }
}

interface DefaultEditorAggParamsProps {
  id: string;
  agg: AggConfig;
  aggIndex: number;
  aggIsTooLow: boolean;
  formIsTouched: boolean;
  vis: Vis;
  groupName: string;
  indexPattern: any;
  onAggTypeChange: (agg: AggConfig, aggType: AggType) => void;
  setTouched: () => void;
  setValidity: (isValid: boolean) => void;
}

function DefaultEditorAggParams({
  agg,
  aggIndex,
  aggIsTooLow,
  groupName,
  formIsTouched,
  indexPattern,
  vis,
  onAggTypeChange,
  setTouched,
  setValidity,
}: DefaultEditorAggParamsProps) {
  const aggTypeOptions = aggTypeFilters.filter(aggTypes.byType[groupName], indexPattern, agg);
  const groupedAggTypeOptions = groupAggregationsBy(aggTypeOptions, 'subtype');
  const isSubAggregation = aggIndex >= 1 && groupName === 'buckets';
  const advancedToggled = false;

  const [aggType, onChangeAggType] = useReducer(reducer, { value: agg.type, touched: false });

  useEffect(
    () => {
      // when a user selectes agg.type we need to update agg.type in angular
      onAggTypeChange(agg, aggType.value);
    },
    [aggType.value]
  );

  useEffect(
    () => {
      // when agg.type was changed in angular
      onChangeAggType({ type: 'agg_selector', value: agg.type });
    },
    [agg.type]
  );

  useEffect(
    () => {
      // when validitywas changed
      setValidity(aggType.validity);
    },
    [aggType.validity]
  );

  useEffect(
    () => {
      // when a form were applied
      onChangeAggType({ type: 'agg_selector_touched', touched: formIsTouched });
    },
    [formIsTouched]
  );

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

  const editorConfig = editorConfigProviders.getConfigForAgg(
    aggTypes.byType[groupName],
    indexPattern,
    agg
  );

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
      params[type].push({
        aggParam: param,
        paramEditor: param.editorComponent,
        indexedFields,
        onChange: () => {},
        setValidity: () => {},
        setTouched: () => {},
        agg,
        config: {},
        editorConfig,
        showValidation: true,
        value: agg.params[param.name],
        visName: vis.type.name,
      } as any);
    }
  });

  return (
    <EuiForm isInvalid={!!errors.length} error={errors}>
      {/* {SchemaEditorComponent && <SchemaEditorComponent />}*/}
      <DefaultEditorAggSelect
        agg={agg}
        value={aggType.value}
        aggTypeOptions={groupedAggTypeOptions}
        isSubAggregation={isSubAggregation}
        showValidation={aggType.touched ? !aggType.validity : false}
        setValue={value => onChangeAggType({ type: 'agg_selector', value })}
        setTouched={() => onChangeAggType({ type: 'agg_selector_touched', touched: true })}
        setValidity={validity => onChangeAggType({ type: 'agg_selector_validity', validity })}
      />

      {params.basic.map((param: any) => (
        <AggParamReactWrapper {...param} />
      ))}

      {params.advanced.length ? (
        <>
          <EuiAccordion
            id="advancedAccordion"
            buttonContent={i18n.translate(
              'common.ui.vis.editors.advancedToggle.advancedLinkLabel',
              {
                defaultMessage: 'Advanced',
              }
            )}
            paddingSize="none"
          >
            {params.advanced.map((param: any) => (
              <AggParamReactWrapper {...param} />
            ))}
          </EuiAccordion>
          <EuiSpacer size="m" />
        </>
      ) : null}
    </EuiForm>
  );
}

export { DefaultEditorAggParams };
