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

import { BasicOptions, SwitchOption, ValidationVisOptionsProps } from '../../common';
import { GridPanel } from './grid_panel';
import { ThresholdPanel } from './threshold_panel';
import { BasicVislibParams } from '../../../types';

function PointSeriesOptions(props: ValidationVisOptionsProps<BasicVislibParams>) {
  const { stateParams, setValue, vis } = props;

  return (
    <>
      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="kbnVislibVisTypes.editors.pointSeries.settingsTitle"
              defaultMessage="Settings"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />

        <BasicOptions {...props} />

        {vis.hasSchemaAgg('segment', 'date_histogram') ? (
          <SwitchOption
            label={i18n.translate('kbnVislibVisTypes.editors.pointSeries.currentTimeMarkerLabel', {
              defaultMessage: 'Current time marker',
            })}
            paramName="addTimeMarker"
            value={stateParams.addTimeMarker}
            setValue={setValue}
          />
        ) : (
          <SwitchOption
            label={i18n.translate('kbnVislibVisTypes.editors.pointSeries.orderBucketsBySumLabel', {
              defaultMessage: 'Order buckets by sum',
            })}
            paramName="orderBucketsBySum"
            value={stateParams.orderBucketsBySum}
            setValue={setValue}
          />
        )}

        {vis.type.type === 'histogram' && (
          <SwitchOption
            label={i18n.translate('kbnVislibVisTypes.editors.pointSeries.showLabels', {
              defaultMessage: 'Show values on chart',
            })}
            paramName="show"
            value={stateParams.labels.show}
            setValue={(paramName, value) =>
              setValue('labels', { ...stateParams.labels, [paramName]: value })
            }
          />
        )}
      </EuiPanel>

      <EuiSpacer size="s" />

      <GridPanel {...props} />

      <EuiSpacer size="s" />

      {stateParams.thresholdLine && <ThresholdPanel {...props} />}
    </>
  );
}

export { PointSeriesOptions };
