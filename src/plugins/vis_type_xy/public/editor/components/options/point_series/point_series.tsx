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

import React from 'react';
import { EuiPanel, EuiTitle, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { BasicOptions, SwitchOption } from '../../../../../../charts/public';

import { VisParams } from '../../../../types';
import { GridPanel } from './grid_panel';
import { ThresholdPanel } from './threshold_panel';
import { ChartType } from '../../../../../common/types';
import { ValidationVisOptionsProps } from '../../common';
import { ElasticChartsOptions } from './elastic_charts_options';

export function PointSeriesOptions(
  props: ValidationVisOptionsProps<
    VisParams,
    {
      showElasticChartsOptions: boolean;
    }
  >
) {
  const { stateParams, setValue, vis } = props;

  return (
    <>
      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="visTypeXy.editors.pointSeries.settingsTitle"
              defaultMessage="Settings"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />

        <BasicOptions {...props} />

        {vis.data.aggs!.aggs.some(
          (agg) => agg.schema === 'segment' && agg.type.name === 'date_histogram'
        ) ? (
          <SwitchOption
            data-test-subj="addTimeMarker"
            label={i18n.translate('visTypeXy.editors.pointSeries.currentTimeMarkerLabel', {
              defaultMessage: 'Current time marker',
            })}
            paramName="addTimeMarker"
            value={stateParams.addTimeMarker}
            setValue={setValue}
          />
        ) : (
          <SwitchOption
            data-test-subj="orderBucketsBySum"
            label={i18n.translate('visTypeXy.editors.pointSeries.orderBucketsBySumLabel', {
              defaultMessage: 'Order buckets by sum',
            })}
            paramName="orderBucketsBySum"
            value={stateParams.orderBucketsBySum}
            setValue={setValue}
          />
        )}

        {vis.type.name === ChartType.Histogram && (
          <SwitchOption
            data-test-subj="showValuesOnChart"
            label={i18n.translate('visTypeXy.editors.pointSeries.showLabels', {
              defaultMessage: 'Show values on chart',
            })}
            paramName="show"
            value={stateParams.labels.show}
            setValue={(paramName, value) =>
              setValue('labels', { ...stateParams.labels, [paramName]: value })
            }
          />
        )}

        {props.extraProps?.showElasticChartsOptions && <ElasticChartsOptions {...props} />}
      </EuiPanel>

      <EuiSpacer size="s" />

      <GridPanel {...props} />

      <EuiSpacer size="s" />

      {stateParams.thresholdLine && <ThresholdPanel {...props} />}
    </>
  );
}
