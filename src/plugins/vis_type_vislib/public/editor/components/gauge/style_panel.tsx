/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { SelectOption } from '../../../../../vis_default_editor/public';
import { GaugeOptionsInternalProps } from '../gauge';
import { AggGroupNames } from '../../../../../data/public';

function StylePanel({ aggs, setGaugeValue, stateParams, vis }: GaugeOptionsInternalProps) {
  const diasableAlignment =
    aggs.byType(AggGroupNames.Metrics).length === 1 && !aggs.byType(AggGroupNames.Buckets);

  return (
    <EuiPanel paddingSize="s">
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="visTypeVislib.controls.gaugeOptions.styleTitle"
            defaultMessage="Style"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <SelectOption
        label={i18n.translate('visTypeVislib.controls.gaugeOptions.gaugeTypeLabel', {
          defaultMessage: 'Gauge type',
        })}
        options={vis.type.editorConfig.collections.gaugeTypes}
        paramName="gaugeType"
        value={stateParams.gauge.gaugeType}
        setValue={setGaugeValue}
      />

      <SelectOption
        disabled={diasableAlignment}
        label={i18n.translate('visTypeVislib.controls.gaugeOptions.alignmentLabel', {
          defaultMessage: 'Alignment',
        })}
        options={vis.type.editorConfig.collections.alignments}
        paramName="alignment"
        value={stateParams.gauge.alignment}
        setValue={setGaugeValue}
      />
    </EuiPanel>
  );
}

export { StylePanel };
