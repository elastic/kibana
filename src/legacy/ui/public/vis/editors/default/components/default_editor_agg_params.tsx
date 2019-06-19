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
import { aggTypes, AggParam } from '../../../../agg_types';
import { AggParamReactWrapper } from '../agg_param_react_wrapper';
import {
  getAggParamsToRender,
  getError,
  getAggTypeOptions,
} from './default_editor_agg_params_helper';
import {
  aggTypeReducer,
  AGG_TYPE_ACTION_KEYS,
  aggParamsReducer,
  AGG_PARAMS_ACTION_KEYS,
  initAggParamsState,
  AggParamsItem,
} from './default_editor_agg_params_state';

import { editorConfigProviders } from '../../config/editor_config_providers';

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
  onAggParamsChange: (agg: AggConfig, paramName: string, value: any) => void;
  onAggTypeChange: (agg: AggConfig, aggType: AggType) => void;
  setTouched: (isTouched: boolean) => void;
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

  const [aggType, onChangeAggType] = useReducer(aggTypeReducer, { touched: false, validity: true });

  const editorConfig = editorConfigProviders.getConfigForAgg(
    aggTypes.byType[groupName],
    indexPattern,
    agg
  );

  useEffect(
    () => {
      Object.keys(editorConfig).forEach(param => {
        const paramConfig = editorConfig[param];
        const paramOptions = agg.type.params.find((paramOption: any) => paramOption.name === param);
        const property = 'fixedValue';
        // If the parameter has a fixed value in the config, set this value.
        // Also for all supported configs we should freeze the editor for this param.
        if (paramConfig.hasOwnProperty('fixedValue')) {
          let newValue;
          if (paramOptions && paramOptions.deserialize) {
            newValue = paramOptions.deserialize(paramConfig[property]);
          } else {
            newValue = paramConfig[property];
          }
          onAggParamsChange(agg, param, newValue);
        }
      });
    },
    [editorConfig]
  );

  const params = getAggParamsToRender(agg, editorConfig, config, vis, responseValueAggs);
  const allParams = [...params.basic, ...params.advanced];
  const [aggParams, onChangeAggParams] = useReducer(
    aggParamsReducer,
    allParams,
    initAggParamsState
  );

  useEffect(
    () => {
      setTouched(false);
    },
    [agg.type]
  );

  const isFormValid =
    aggType.validity &&
    Object.keys(aggParams).every((paramsName: string) => aggParams[paramsName].validity);
  const isReactFormTouched =
    (agg.type ? false : aggType.touched) &&
    Object.keys(aggParams).every((paramsName: string) =>
      aggParams[paramsName].validity ? true : aggParams[paramsName].touched
    );

  useEffect(
    () => {
      setValidity(isFormValid);
    },
    [isFormValid, agg.type]
  );

  useEffect(
    () => {
      // when all invalid controls were touched
      if (isReactFormTouched) {
        setTouched(true);
      }
    },
    [isReactFormTouched]
  );

  const renderParam = (paramInstance, model: AggParamsItem) => {
    return (
      <AggParamReactWrapper
        key={`${paramInstance.aggParam.name}${agg.type ? agg.type.name : ''}`}
        showValidation={formIsTouched || model.touched ? !model.validity : false}
        onChange={onAggParamsChange}
        setValidity={validity => {
          onChangeAggParams({
            type: AGG_PARAMS_ACTION_KEYS.VALIDITY,
            paramName: paramInstance.aggParam.name,
            validity,
          });
        }}
        setTouched={() => {
          onChangeAggParams({
            type: AGG_PARAMS_ACTION_KEYS.TOUCHED,
            paramName: paramInstance.aggParam.name,
            touched: true,
          });
        }}
        {...paramInstance}
      />
    );
  };

  return (
    <EuiForm isInvalid={!!errors.length} error={errors}>
      {SchemaEditorComponent && <SchemaEditorComponent />}
      <DefaultEditorAggSelect
        agg={agg}
        value={agg.type}
        aggTypeOptions={groupedAggTypeOptions}
        isSubAggregation={isSubAggregation}
        showValidation={formIsTouched || aggType.touched ? !aggType.validity : false}
        setValue={value => {
          onAggTypeChange(agg, value);
          // reset touched and validity of params
          onChangeAggParams({ type: AGG_PARAMS_ACTION_KEYS.RESET });
          // resent form validity
          setValidity(true);
        }}
        setTouched={() => onChangeAggType({ type: AGG_TYPE_ACTION_KEYS.TOUCHED, touched: true })}
        setValidity={validity => onChangeAggType({ type: AGG_TYPE_ACTION_KEYS.VALIDITY, validity })}
      />

      {params.basic.map((param: any) => {
        const model = aggParams[param.aggParam.name] || {
          touched: false,
          validity: true,
        };

        return renderParam(param, model);
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
              return renderParam(param, model);
            })}
          </EuiAccordion>
          <EuiSpacer size="m" />
        </>
      ) : null}
    </EuiForm>
  );
}

export { DefaultEditorAggParams };
