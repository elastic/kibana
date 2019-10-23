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

import React, { useCallback } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { DefaultEditorAggGroup } from './agg_group';
import { AggGroupNames } from '../agg_groups';

function DefaultEditorDataTab({
  metricAggs,
  state,
  schemas,
  onParamChange,
  onToggleEnableAgg,
  removeAgg,
  reorderAggs,
  dispatch,
}) {
  const setValidity = () => {
    console.log('setValidity');
  };
  const setTouched = () => {
    console.log('setTouched');
  };

  const onAggParamsChange = useCallback(
    (aggId, paramName, value) => {
      dispatch({
        type: 'setAggParamValue',
        payload: {
          aggId,
          paramName,
          value,
        },
      });
    },
    [dispatch]
  );

  const addSchema = useCallback(
    schema =>
      dispatch({
        type: 'addNewAgg',
        payload: {
          schema,
        },
      }),
    [dispatch]
  );

  const commonProps = {
    addSchema,
    metricAggs,
    state,
    reorderAggs,
    onAggParamsChange,
    onToggleEnableAgg,
    setValidity,
    setTouched,
    removeAgg,
  };

  return (
    <>
      <DefaultEditorAggGroup
        data-test-subj="metricsAggGroup"
        formIsTouched={false}
        groupName={AggGroupNames.Metrics}
        schemas={schemas.metrics}
        {...commonProps}
      />

      <EuiSpacer size="s" />

      <DefaultEditorAggGroup
        data-test-subj="bucketsAggGroup"
        formIsTouched={false}
        groupName={AggGroupNames.Buckets}
        schemas={schemas.buckets}
        {...commonProps}
      />
    </>
  );
}

export { DefaultEditorDataTab };
