/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFormLabel, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useMount from 'react-use/lib/useMount';

import { AggParamType, IAggConfig, AggGroupNames } from '@kbn/data-plugin/public';
import { useSubAggParamsHandlers } from './utils';
import { AggParamEditorProps } from '../agg_param_props';
import { DefaultEditorAggParams } from '../agg_params';

function SubMetricParamEditor({
  agg,
  aggParam,
  formIsTouched,
  metricAggs,
  state,
  setValue,
  setValidity,
  setTouched,
  schemas,
}: AggParamEditorProps<IAggConfig, AggParamType>) {
  const metricTitle = i18n.translate('visDefaultEditor.controls.metrics.metricTitle', {
    defaultMessage: 'Metric',
  });
  const bucketTitle = i18n.translate('visDefaultEditor.controls.metrics.bucketTitle', {
    defaultMessage: 'Bucket',
  });
  const type = aggParam.name;
  const isCustomMetric = type === 'customMetric';

  const aggTitle = isCustomMetric ? metricTitle : bucketTitle;
  const aggGroup = isCustomMetric ? AggGroupNames.Metrics : AggGroupNames.Buckets;

  useMount(() => {
    if (agg.params[type]) {
      setValue(agg.params[type]);
    } else {
      setValue(aggParam.makeAgg(agg));
    }
  });

  const { onAggTypeChange, setAggParamValue } = useSubAggParamsHandlers(
    agg,
    aggParam,
    agg.params[type],
    setValue
  );

  if (!agg.params[type]) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFormLabel>{aggTitle}</EuiFormLabel>
      <EuiSpacer size="s" />
      <DefaultEditorAggParams
        agg={agg.params[type]}
        allowedAggs={aggParam.allowedAggs}
        groupName={aggGroup}
        className="visEditorAgg__subAgg"
        formIsTouched={formIsTouched}
        indexPattern={agg.getIndexPattern()}
        metricAggs={metricAggs}
        state={state}
        setAggParamValue={setAggParamValue}
        onAggTypeChange={onAggTypeChange}
        setValidity={setValidity}
        setTouched={setTouched}
        schemas={schemas}
        hideCustomLabel={!isCustomMetric}
      />
    </>
  );
}

export { SubMetricParamEditor };
