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
import React, { useReducer, useEffect } from 'react';

import { EuiForm, EuiAccordion, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AggType } from 'ui/agg_types';
import { AggConfig, Vis } from 'ui/vis';
import { DefaultEditorAggSelect } from './default_editor_agg_select';
// @ts-ignore
import { aggTypes } from '../../../../agg_types';
import { AggParamReactWrapper } from '../agg_param_react_wrapper';
import {
  getAggParamsToRender,
  getError,
  getAggTypeOptions,
} from './default_editor_agg_params_helper';

import { editorConfigProviders } from '../../config/editor_config_providers';

function reducer(state: any, action: any) {
  switch (action.type) {
    case 'agg_selector_touched':
      return { ...state, touched: action.touched };
    case 'agg_selector_validity':
      return { ...state, validity: action.validity };
    case 'agg_type_reset':
      return { validity: true, touched: false };
    default:
      throw new Error();
  }
}

const aggParamsReducer = (state: any, action: any) => {
  const targetParam = state[action.paramName] || {
    validity: true,
    touched: false,
  };
  switch (action.type) {
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
    case 'agg_params_reset':
      return {};
    default:
      throw new Error();
  }
};

const initaggParams = (params: object[]) => {
  const state: any = {};
  params.forEach((param: any) => {
    state[param.aggParam.name] = {
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
  config: any;
  formIsTouched: boolean;
  vis: Vis;
  groupName: string;
  indexPattern: any;
  responseValueAggs: AggConfig[] | null;
  onAggParamsChange: (agg: AggConfig, aggParams: any) => void;
  onAggTypeChange: (agg: AggConfig, aggType: AggType) => void;
  setTouched: () => void;
  setValidity: (isValid: boolean) => void;
}

function DefaultEditorAggParams({
  agg,
  aggIndex,
  aggIsTooLow,
  config,
  groupName,
  formIsTouched,
  indexPattern,
  responseValueAggs,
  vis,
  onAggParamsChange,
  onAggTypeChange,
  setTouched,
  setValidity,
}: DefaultEditorAggParamsProps) {
  const groupedAggTypeOptions = getAggTypeOptions(agg, indexPattern, groupName);
  const isSubAggregation = aggIndex >= 1 && groupName === 'buckets';
  const errors = getError(agg, aggIsTooLow);
  const SchemaEditorComponent = agg.schema.editorComponent;

  const [aggType, onChangeAggType] = useReducer(reducer, { touched: false });

  const editorConfig = editorConfigProviders.getConfigForAgg(
    aggTypes.byType[groupName],
    indexPattern,
    agg
  );

  Object.keys(editorConfig).forEach(param => {
    const paramConfig = editorConfig[param];
    const paramOptions = agg.type.params.find((paramOption: any) => paramOption.name === param);
    const property = 'fixedValue';
    // If the parameter has a fixed value in the config, set this value.
    // Also for all supported configs we should freeze the editor for this param.
    if (paramConfig.hasOwnProperty('fixedValue')) {
      if (paramOptions && paramOptions.deserialize) {
        agg.params[param] = paramOptions.deserialize(paramConfig[property]);
      } else {
        agg.params[param] = paramConfig[property];
      }
    }
  });

  const params = getAggParamsToRender(agg, editorConfig, config, vis, responseValueAggs);
  const [aggParams, onChangeAggParams] = useReducer(
    aggParamsReducer,
    [...params.basic, ...params.advanced],
    initaggParams
  );

  useEffect(
    () => {
      // reset touched and validity of params
      onChangeAggParams({ type: 'agg_params_reset' });
      onChangeAggType({ type: 'agg_type_reset' });
    },
    [agg.type]
  );

  const isFormValid =
    aggType.validity &&
    Object.keys(aggParams).every((paramsName: string) => aggParams[paramsName].validity);
  const isReactFormTouched =
    aggType.touched ||
    Object.keys(aggParams).every((paramsName: string) => aggParams[paramsName].touched);

  useEffect(
    () => {
      // when validity was changed
      setValidity(isFormValid);
    },
    [isFormValid]
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
      // when a form were touched
      if (isReactFormTouched) {
        setTouched();
      }
    },
    [isReactFormTouched]
  );

  return (
    <EuiForm isInvalid={!!errors.length} error={errors}>
      {SchemaEditorComponent && <SchemaEditorComponent />}
      <DefaultEditorAggSelect
        agg={agg}
        value={agg.type}
        aggTypeOptions={groupedAggTypeOptions}
        isSubAggregation={isSubAggregation}
        showValidation={aggType.touched ? !aggType.validity : false}
        setValue={value => onAggTypeChange(agg, value)}
        setTouched={() => onChangeAggType({ type: 'agg_selector_touched', touched: true })}
        setValidity={validity => onChangeAggType({ type: 'agg_selector_validity', validity })}
      />

      {params.basic.map((param: any) => {
        const model = aggParams[param.aggParam.name] || {
          touched: false,
          validity: true,
        };
        return (
          <AggParamReactWrapper
            key={`${param.aggParam.name}${agg.type ? agg.type.name : ''}`}
            showValidation={model.touched ? !model.validity : false}
            onChange={onAggParamsChange}
            setValidity={validity =>
              onChangeAggParams({
                type: 'agg_params_validity',
                paramName: param.aggParam.name,
                validity,
              })
            }
            setTouched={() =>
              onChangeAggParams({
                type: 'agg_params_touched',
                paramName: param.aggParam.name,
                touched: true,
              })
            }
            {...param}
          />
        );
      })}

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
            {params.advanced.map((param: any) => {
              const model = aggParams[param.aggParam.name] || {
                touched: false,
                validity: true,
              };
              return (
                <AggParamReactWrapper
                  key={`${param.aggParam.name}${agg.type ? agg.type.name : ''}`}
                  showValidation={model.touched ? !model.validity : false}
                  onChange={onAggParamsChange}
                  setValidity={validity =>
                    onChangeAggParams({
                      type: 'agg_params_validity',
                      paramName: param.aggParam.name,
                      validity,
                    })
                  }
                  setTouched={() =>
                    onChangeAggParams({
                      type: 'agg_params_touched',
                      paramName: param.aggParam.name,
                      touched: true,
                    })
                  }
                  {...param}
                />
              );
            })}
          </EuiAccordion>
          <EuiSpacer size="m" />
        </>
      ) : null}
    </EuiForm>
  );
}

export { DefaultEditorAggParams };
