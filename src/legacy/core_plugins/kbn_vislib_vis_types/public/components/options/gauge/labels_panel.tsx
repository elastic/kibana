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
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { SwitchOption, TextInputOption } from '../../common';
import { GaugeOptionsInternalProps } from '.';

function LabelsPanel({ stateParams, setValue, setGaugeValue }: GaugeOptionsInternalProps) {
  return (
    <EuiPanel paddingSize="s">
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="kbnVislibVisTypes.controls.gaugeOptions.labelsTitle"
            defaultMessage="Labels"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <SwitchOption
        label={i18n.translate('kbnVislibVisTypes.controls.gaugeOptions.showLabelsLabel', {
          defaultMessage: 'Show labels',
        })}
        paramName="show"
        value={stateParams.gauge.labels.show}
        setValue={(paramName, value) =>
          setGaugeValue('labels', { ...stateParams.gauge.labels, [paramName]: value })
        }
      />
      <EuiSpacer size="s" />

      <TextInputOption
        disabled={!stateParams.gauge.labels.show}
        label={i18n.translate('kbnVislibVisTypes.controls.gaugeOptions.subTextLabel', {
          defaultMessage: 'Sub label',
        })}
        paramName="subText"
        value={stateParams.gauge.style.subText}
        setValue={(paramName, value) =>
          setGaugeValue('style', { ...stateParams.gauge.style, [paramName]: value })
        }
      />

      <SwitchOption
        disabled={!stateParams.gauge.labels.show}
        label={i18n.translate('kbnVislibVisTypes.controls.gaugeOptions.displayWarningsLabel', {
          defaultMessage: 'Display warnings',
        })}
        tooltip={i18n.translate('kbnVislibVisTypes.controls.gaugeOptions.switchWarningsTooltip', {
          defaultMessage:
            'Turns on/off warnings. When turned on, a warning will be shown if not all labels could be displayed.',
        })}
        paramName="isDisplayWarning"
        value={stateParams.isDisplayWarning}
        setValue={setValue}
      />
    </EuiPanel>
  );
}

export { LabelsPanel };
