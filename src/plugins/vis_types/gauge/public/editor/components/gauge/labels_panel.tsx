/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SwitchOption, TextInputOption } from '../../../../../../vis_default_editor/public';
import { GaugeOptionsInternalProps } from '../gauge';

function LabelsPanel({ stateParams, setValue, setGaugeValue }: GaugeOptionsInternalProps) {
  return (
    <EuiPanel paddingSize="s">
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="visTypeGauge.controls.gaugeOptions.labelsTitle"
            defaultMessage="Labels"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <SwitchOption
        label={i18n.translate('visTypeGauge.controls.gaugeOptions.showLabelsLabel', {
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
        label={i18n.translate('visTypeGauge.controls.gaugeOptions.subTextLabel', {
          defaultMessage: 'Sub label',
        })}
        paramName="subText"
        value={stateParams.gauge.style.subText}
        setValue={(paramName, value) =>
          setGaugeValue('style', { ...stateParams.gauge.style, [paramName]: value })
        }
      />
    </EuiPanel>
  );
}

export { LabelsPanel };
