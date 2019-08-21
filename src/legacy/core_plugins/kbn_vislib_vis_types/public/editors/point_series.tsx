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

import { VisOptionsProps } from 'ui/vis/editors/default';
import { SwitchOption } from '../controls/switch';
import { GridOptions } from '../controls/point_series/grid_options';
import { BasicOptions } from '../controls/basic_options';
import { BasicVislibParams } from '../types';
import { NumberInputOption } from '../controls/number_input';
import { SelectOption } from '../controls/select';

function PointSeriesOptions(props: VisOptionsProps<BasicVislibParams>) {
  const { stateParams, setValue, vis } = props;
  const options = [
    {value: 'full', text: 'Full'},
    {value: 'dashed', text: 'Dashed'},
    {value: 'dot-dashed', text: 'Dot-dashed'},
  ];

  return (
    <>
      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h2>
            <FormattedMessage
              id="kbnVislibVisTypes.editors.pointSeries.settingsTitle"
              defaultMessage="Settings"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s"/>

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

      <EuiSpacer size="s"/>

      <GridOptions {...props} />

      <EuiSpacer size="s"/>

      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h2>
            <FormattedMessage
              id="kbnVislibVisTypes.editors.pointSeries.thresholdLineSettings"
              defaultMessage="Threshold Line"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s"/>


        <SwitchOption
          label={i18n.translate('kbnVislibVisTypes.editors.pointSeries.thresholdLine.show', {
            defaultMessage: 'Show threshold line',
          })}
          paramName="show"
          value={stateParams.thresholdLine.show}
          setValue={(paramName, value) =>
            setValue('thresholdLine', { ...stateParams.thresholdLine, [paramName]: value })
          }
        />

        {stateParams.thresholdLine.show && (

          <React.Fragment>

          <NumberInputOption
          label={i18n.translate('kbnVislibVisTypes.editors.pointSeries.thresholdLine.valueLabel', {
          defaultMessage: 'Threshold value',
        })}
          paramName="value"
          value={stateParams.thresholdLine.value}
          step={0.1}
          setValue={(paramName, value) =>
          setValue('thresholdLine', { ...stateParams.thresholdLine, [paramName]: value })
        }
          />

          <NumberInputOption
          label={i18n.translate('kbnVislibVisTypes.editors.pointSeries.thresholdLine.widthLabel', {
          defaultMessage: 'Line width',
        })}
          paramName="width"
          min={1}
          step={1}
          value={stateParams.thresholdLine.width}
          setValue={(paramName, value) =>
          setValue('thresholdLine', { ...stateParams.thresholdLine, [paramName]: value })
        }
          />

          <SelectOption
          label={i18n.translate('kbnVislibVisTypes.editors.pointSeries.thresholdLine.style', {
          defaultMessage: 'Line style',
        })}
          options={options}
          paramName="style"
          value={stateParams.thresholdLine.style}
          setValue={(paramName, value) =>
          setValue('thresholdLine', { ...stateParams.thresholdLine, [paramName]: value })
        }
          />

          </React.Fragment>
          )
        }

      </EuiPanel>

    </>
  );
}

export { PointSeriesOptions };
