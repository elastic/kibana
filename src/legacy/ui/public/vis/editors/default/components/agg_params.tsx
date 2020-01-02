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

import React, { useReducer, useEffect, useMemo } from 'react';
import { EuiForm, EuiAccordion, EuiSpacer, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useUnmount from 'react-use/lib/useUnmount';

import { VisState } from 'ui/vis';
import { IndexPattern } from 'ui/index_patterns';
import { aggTypes, AggType, AggParam, AggConfig } from 'ui/agg_types/';

import { DefaultEditorAggSelect } from './agg_select';
import { DefaultEditorAggParam } from './agg_param';
import {
  getAggParamsToRender,
  getError,
  getAggTypeOptions,
  ParamInstance,
  isInvalidParamsTouched,
} from './agg_params_helper';
import {
  aggTypeReducer,
  AGG_TYPE_ACTION_KEYS,
  aggParamsReducer,
  AGG_PARAMS_ACTION_KEYS,
  initAggParamsState,
  AggParamsItem,
} from './agg_params_state';
import { editorConfigProviders } from '../../config/editor_config_providers';
import { FixedParam, TimeIntervalParam, EditorParamConfig } from '../../config/types';
import { AggGroupNames } from '../agg_groups';
import { OnAggParamsChange } from './agg_common_props';

const FIXED_VALUE_PROP = 'fixedValue';
const DEFAULT_PROP = 'default';
type EditorParamConfigType = EditorParamConfig & {
  [key: string]: unknown;
};
export interface SubAggParamsProp {
  formIsTouched: boolean;
  onAggParamsChange: OnAggParamsChange;
  onAggTypeChange: (agg: AggConfig, aggType: AggType) => void;
}
export interface DefaultEditorAggParamsProps extends SubAggParamsProp {
  agg: AggConfig;
  aggError?: string;
  aggIndex?: number;
  aggIsTooLow?: boolean;
  className?: string;
  disabledParams?: string[];
  groupName: string;
  indexPattern: IndexPattern;
  metricAggs: AggConfig[];
  state: VisState;
  setTouched: (isTouched: boolean) => void;
  setValidity: (isValid: boolean) => void;
}

function DefaultEditorAggParams({
  agg,
  aggError,
  aggIndex = 0,
  aggIsTooLow = false,
  className,
  disabledParams,
  groupName,
  formIsTouched,
  indexPattern,
  metricAggs,
  state = {} as VisState,
  onAggParamsChange,
  onAggTypeChange,
  setTouched,
  setValidity,
}: DefaultEditorAggParamsProps) {
  const groupedAggTypeOptions = getAggTypeOptions(agg, indexPattern, groupName);
  const errors = getError(agg, aggIsTooLow);

  const editorConfig = useMemo(
    () => editorConfigProviders.getConfigForAgg((aggTypes as any)[groupName], indexPattern, agg),
    [groupName, agg.type]
  );
  const params = getAggParamsToRender({ agg, editorConfig, metricAggs, state });
  const allParams = [...params.basic, ...params.advanced];
  const [paramsState, onChangeParamsState] = useReducer(
    aggParamsReducer,
    allParams,
    initAggParamsState
  );
  const [aggType, onChangeAggType] = useReducer(aggTypeReducer, { touched: false, valid: true });

  const isFormValid =
    !errors.length &&
    aggType.valid &&
    Object.entries(paramsState).every(([, paramState]) => paramState.valid);

  const isAllInvalidParamsTouched =
    !!errors.length || isInvalidParamsTouched(agg.type, aggType, paramsState);

  // reset validity before component destroyed
  useUnmount(() => setValidity(true));

  useEffect(() => {
    Object.entries(editorConfig).forEach(([param, paramConfig]) => {
      const paramOptions = agg.type.params.find(
        (paramOption: AggParam) => paramOption.name === param
      );

      const hasFixedValue = paramConfig.hasOwnProperty(FIXED_VALUE_PROP);
      const hasDefault = paramConfig.hasOwnProperty(DEFAULT_PROP);
      // If the parameter has a fixed value in the config, set this value.
      // Also for all supported configs we should freeze the editor for this param.
      if (hasFixedValue || hasDefault) {
        let newValue;
        let property = FIXED_VALUE_PROP;
        let typedParamConfig: EditorParamConfigType = paramConfig as FixedParam;

        if (hasDefault) {
          property = DEFAULT_PROP;
          typedParamConfig = paramConfig as TimeIntervalParam;
        }

        if (paramOptions && paramOptions.deserialize) {
          newValue = paramOptions.deserialize(typedParamConfig[property]);
        } else {
          newValue = typedParamConfig[property];
        }
        onAggParamsChange(agg.params, param, newValue);
      }
    });
  }, [editorConfig]);

  useEffect(() => {
    setTouched(false);
  }, [agg.type]);

  useEffect(() => {
    setValidity(isFormValid);
  }, [isFormValid, agg.type]);

  useEffect(() => {
    // when all invalid controls were touched or they are untouched
    setTouched(isAllInvalidParamsTouched);
  }, [isAllInvalidParamsTouched]);

  const renderParam = (paramInstance: ParamInstance, model: AggParamsItem) => {
    return (
      <DefaultEditorAggParam
        key={`${paramInstance.aggParam.name}${agg.type ? agg.type.name : ''}`}
        disabled={disabledParams && disabledParams.includes(paramInstance.aggParam.name)}
        showValidation={formIsTouched || model.touched}
        onChange={onAggParamsChange}
        setValidity={valid => {
          onChangeParamsState({
            type: AGG_PARAMS_ACTION_KEYS.VALID,
            paramName: paramInstance.aggParam.name,
            payload: valid,
          });
        }}
        // setTouched can be called from sub-agg which passes a parameter
        setTouched={(isTouched: boolean = true) => {
          onChangeParamsState({
            type: AGG_PARAMS_ACTION_KEYS.TOUCHED,
            paramName: paramInstance.aggParam.name,
            payload: isTouched,
          });
        }}
        subAggParams={{
          onAggParamsChange,
          onAggTypeChange,
          formIsTouched,
        }}
        {...paramInstance}
      />
    );
  };

  return (
    <EuiForm
      className={className}
      isInvalid={!!errors.length}
      error={errors}
      data-test-subj="visAggEditorParams"
    >
      <DefaultEditorAggSelect
        aggError={aggError}
        id={agg.id}
        indexPattern={indexPattern}
        value={agg.type}
        aggTypeOptions={groupedAggTypeOptions}
        isSubAggregation={aggIndex >= 1 && groupName === AggGroupNames.Buckets}
        showValidation={formIsTouched || aggType.touched}
        setValue={value => {
          onAggTypeChange(agg, value);
          // reset touched and valid of params
          onChangeParamsState({ type: AGG_PARAMS_ACTION_KEYS.RESET });
        }}
        setTouched={() => onChangeAggType({ type: AGG_TYPE_ACTION_KEYS.TOUCHED, payload: true })}
        setValidity={valid => onChangeAggType({ type: AGG_TYPE_ACTION_KEYS.VALID, payload: valid })}
      />

      {params.basic.map((param: ParamInstance) => {
        const model = paramsState[param.aggParam.name] || {
          touched: false,
          valid: true,
        };

        return renderParam(param, model);
      })}

      {params.advanced.length ? (
        <EuiFormRow>
          <EuiAccordion
            id="advancedAccordion"
            data-test-subj={`advancedParams-${agg.id}`}
            buttonContent={i18n.translate(
              'common.ui.vis.editors.advancedToggle.advancedLinkLabel',
              {
                defaultMessage: 'Advanced',
              }
            )}
          >
            <EuiSpacer size="s" />
            {params.advanced.map((param: ParamInstance) => {
              const model = paramsState[param.aggParam.name] || {
                touched: false,
                valid: true,
              };
              return renderParam(param, model);
            })}
          </EuiAccordion>
        </EuiFormRow>
      ) : null}
    </EuiForm>
  );
}

export { DefaultEditorAggParams };
