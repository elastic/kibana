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

import React, { useCallback, useReducer, useEffect, useMemo } from 'react';
import { EuiForm, EuiAccordion, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useUnmount from 'react-use/lib/useUnmount';

import { IndexPattern } from 'src/plugins/data/public';
import {
  AggConfig,
  AggGroupNames,
  editorConfigProviders,
  FixedParam,
  TimeIntervalParam,
  EditorParamConfig,
} from '../legacy_imports';

import { DefaultEditorAggSelect } from './agg_select';
import { DefaultEditorAggParam } from './agg_param';
import {
  getAggParamsToRender,
  getAggTypeOptions,
  isInvalidParamsTouched,
} from './agg_params_helper';
import {
  aggTypeReducer,
  aggParamsReducer,
  AGG_PARAMS_ACTION_KEYS,
  initAggParamsState,
} from './agg_params_state';
import { DefaultEditorCommonProps } from './agg_common_props';

const FIXED_VALUE_PROP = 'fixedValue';
const DEFAULT_PROP = 'default';
type EditorParamConfigType = EditorParamConfig & {
  [key: string]: unknown;
};

export interface DefaultEditorAggParamsProps extends DefaultEditorCommonProps {
  agg: AggConfig;
  aggError?: string;
  aggIndex?: number;
  aggIsTooLow?: boolean;
  className?: string;
  disabledParams?: string[];
  indexPattern: IndexPattern;
  setValidity: (isValid: boolean) => void;
  setTouched: (isTouched: boolean) => void;
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
  state,
  setAggParamValue,
  onAggTypeChange,
  setTouched,
  setValidity,
}: DefaultEditorAggParamsProps) {
  const groupedAggTypeOptions = useMemo(() => getAggTypeOptions(agg, indexPattern, groupName), [
    agg,
    indexPattern,
    groupName,
  ]);
  const error = aggIsTooLow
    ? i18n.translate('visDefaultEditor.aggParams.errors.aggWrongRunOrderErrorMessage', {
        defaultMessage: '"{schema}" aggs must run before all other buckets!',
        values: { schema: agg.schema.title },
      })
    : '';

  const editorConfig = useMemo(() => editorConfigProviders.getConfigForAgg(indexPattern, agg), [
    indexPattern,
    agg,
  ]);
  const params = useMemo(() => getAggParamsToRender({ agg, editorConfig, metricAggs, state }), [
    agg,
    editorConfig,
    metricAggs,
    state,
  ]);
  const allParams = [...params.basic, ...params.advanced];
  const [paramsState, onChangeParamsState] = useReducer(
    aggParamsReducer,
    allParams,
    initAggParamsState
  );
  const [aggType, onChangeAggType] = useReducer(aggTypeReducer, { touched: false, valid: true });

  const isFormValid =
    !error &&
    aggType.valid &&
    Object.entries(paramsState).every(([, paramState]) => paramState.valid);

  const isAllInvalidParamsTouched =
    !!error || isInvalidParamsTouched(agg.type, aggType, paramsState);

  const onAggSelect = useCallback(
    value => {
      if (agg.type !== value) {
        onAggTypeChange(agg.id, value);
        // reset touched and valid of params
        onChangeParamsState({ type: AGG_PARAMS_ACTION_KEYS.RESET });
      }
    },
    [onAggTypeChange, agg]
  );

  // reset validity before component destroyed
  useUnmount(() => setValidity(true));

  useEffect(() => {
    Object.entries(editorConfig).forEach(([param, paramConfig]) => {
      const paramOptions = agg.type.params.find(paramOption => paramOption.name === param);

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

        // this check is obligatory to avoid infinite render, because setAggParamValue creates a brand new agg object
        if (agg.params[param] !== newValue) {
          setAggParamValue(agg.id, param, newValue);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorConfig]);

  useEffect(() => {
    setTouched(false);
  }, [agg.type, setTouched]);

  useEffect(() => {
    setValidity(isFormValid);
  }, [isFormValid, agg.type, setValidity]);

  useEffect(() => {
    // when all invalid controls were touched or they are untouched
    setTouched(isAllInvalidParamsTouched);
  }, [isAllInvalidParamsTouched, setTouched]);

  return (
    <EuiForm
      className={className}
      isInvalid={!!error}
      error={error}
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
        setValue={onAggSelect}
        onChangeAggType={onChangeAggType}
      />

      {params.basic.map(param => {
        const model = paramsState[param.aggParam.name] || {
          touched: false,
          valid: true,
        };

        return (
          <DefaultEditorAggParam
            key={`${param.aggParam.name}${agg.type ? agg.type.name : ''}`}
            disabled={disabledParams && disabledParams.includes(param.aggParam.name)}
            formIsTouched={formIsTouched}
            showValidation={formIsTouched || model.touched}
            setAggParamValue={setAggParamValue}
            onChangeParamsState={onChangeParamsState}
            {...param}
          />
        );
      })}

      {params.advanced.length ? (
        <>
          <EuiSpacer size="m" />
          <EuiAccordion
            id="advancedAccordion"
            data-test-subj={`advancedParams-${agg.id}`}
            buttonContent={i18n.translate('visDefaultEditor.advancedToggle.advancedLinkLabel', {
              defaultMessage: 'Advanced',
            })}
          >
            <EuiSpacer size="s" />
            {params.advanced.map(param => {
              const model = paramsState[param.aggParam.name] || {
                touched: false,
                valid: true,
              };

              return (
                <DefaultEditorAggParam
                  key={`${param.aggParam.name}${agg.type ? agg.type.name : ''}`}
                  disabled={disabledParams && disabledParams.includes(param.aggParam.name)}
                  formIsTouched={formIsTouched}
                  showValidation={formIsTouched || model.touched}
                  setAggParamValue={setAggParamValue}
                  onChangeParamsState={onChangeParamsState}
                  {...param}
                />
              );
            })}
          </EuiAccordion>
        </>
      ) : null}
    </EuiForm>
  );
}

export { DefaultEditorAggParams };
