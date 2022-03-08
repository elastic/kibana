/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiPanel, EuiSpacer, EuiTitle, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { SelectOption } from '../../../../../../vis_default_editor/public';
import { GaugeOptionsInternalProps } from '../gauge';
import { AggGroupNames } from '../../../../../../data/public';
import { getGaugeCollections } from './../../collections';

const gaugeCollections = getGaugeCollections();

function StylePanel({
  aggs,
  setGaugeValue,
  stateParams,
  showElasticChartsOptions,
}: GaugeOptionsInternalProps) {
  const disableAlignment =
    aggs.byType(AggGroupNames.Metrics).length === 1 && !aggs.byType(AggGroupNames.Buckets);

  const alignmentSelect = (
    <SelectOption
      disabled={showElasticChartsOptions || disableAlignment}
      label={i18n.translate('visTypeGauge.controls.gaugeOptions.alignmentLabel', {
        defaultMessage: 'Alignment',
      })}
      options={gaugeCollections.alignments}
      paramName="alignment"
      value={stateParams.gauge.alignment}
      setValue={setGaugeValue}
    />
  );

  return (
    <EuiPanel paddingSize="s">
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="visTypeGauge.controls.gaugeOptions.styleTitle"
            defaultMessage="Style"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <SelectOption
        label={i18n.translate('visTypeGauge.controls.gaugeOptions.gaugeTypeLabel', {
          defaultMessage: 'Gauge type',
        })}
        options={gaugeCollections.gaugeTypes}
        paramName="gaugeType"
        value={stateParams.gauge.gaugeType}
        setValue={setGaugeValue}
      />
      {showElasticChartsOptions ? (
        <>
          <EuiSpacer size="s" />
          <EuiToolTip
            content={i18n.translate('visTypeGauge.editors.gauge.alignmentNotAvailable', {
              defaultMessage:
                'The alignment is not yet supported with the new charts library. Please, enable the gauge legacy charts library advanced setting.',
            })}
            delay="long"
            position="right"
          >
            {alignmentSelect}
          </EuiToolTip>
          <EuiSpacer size="s" />
        </>
      ) : (
        alignmentSelect
      )}
    </EuiPanel>
  );
}

export { StylePanel };
