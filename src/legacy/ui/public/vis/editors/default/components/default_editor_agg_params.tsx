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
import React, { useReducer, useEffect, createContext } from 'react';

import { EuiForm, EuiAccordion, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AggType } from 'ui/agg_types';
import { AggConfig, Vis } from 'ui/vis';
import { DefaultEditorAggSelect } from './default_editor_agg_select';
import { aggTypeFilters } from '../../../../agg_types/filter';
import { aggTypes } from '../../../../agg_types';
import { groupAggregationsBy } from '../default_editor_utils';
import { editorConfigProviders } from '../../config/editor_config_providers';
import { AggParamReactWrapper } from '../agg_param_react_wrapper';
import { getAggParamsToRender, getError } from './default_editor_agg_params_helper';

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

const aggParamsReducer = (state: any, action: any) => {
  const targetParam = state[action.paramName] || {
    value: undefined,
    validity: true,
    touched: false,
  };
  switch (action.type) {
    case 'agg_params_value':
      return {
        ...state,
        [action.paramName]: {
          ...targetParam,
          value: action.value,
        },
      };
    case 'agg_params_touched':
      return {
        ...state,
        [action.paramName]: {
          ...targetParam,
          touched: action.touched,
        },
      };
    case 'agg_params_validity':
      return {
        ...state,
        [action.paramName]: {
          ...targetParam,
          validity: action.validity,
        },
      };
    case 'agg_params_values':
      const newState = { ...state };
      Object.keys(action.params).forEach(paramName => {
        const model = newState[paramName] || { validity: true, touched: false };
        model.value = action.params[paramName];
      });
      return newState;
    default:
      throw new Error();
  }
};

const initaggParams = (params: any) => {
  const state: any = {};
  Object.keys(params).forEach((paramName: any) => {
    state[paramName] = {
      value: params[paramName],
      validity: true,
      touched: false,
    };
  });

  return state;
};

interface DefaultEditorAggParamsProps {
  id: string;
  agg: AggConfig;
  aggIndex: number;
  aggIsTooLow: boolean;
  formIsTouched: boolean;
  vis: Vis;
  groupName: string;
  indexPattern: any;
  responseValueAggs: AggConfig[] | null;
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
  responseValueAggs,
  vis,
  onAggTypeChange,
  setTouched,
  setValidity,
}: DefaultEditorAggParamsProps) {
  const aggTypeOptions = aggTypeFilters.filter(aggTypes.byType[groupName], indexPattern, agg);
  const groupedAggTypeOptions = groupAggregationsBy(aggTypeOptions, 'subtype');
  const isSubAggregation = aggIndex >= 1 && groupName === 'buckets';
  const errors = getError(agg, aggIsTooLow);

  const editorConfig = editorConfigProviders.getConfigForAgg(
    aggTypes.byType[groupName],
    indexPattern,
    agg
  );

  const [aggType, onChangeAggType] = useReducer(reducer, { value: agg.type, touched: false });
  const [aggParams, onChangeAggParams] = useReducer(aggParamsReducer, agg.params, initaggParams);

  const params = getAggParamsToRender(
    agg,
    editorConfig,
    vis,
    responseValueAggs,
    aggParams,
    onChangeAggParams
  );

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

  useEffect(
    () => {
      // when params were updated
      onChangeAggParams({ type: 'agg_params_values', params: agg.params });
    },
    [agg.params]
  );

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
