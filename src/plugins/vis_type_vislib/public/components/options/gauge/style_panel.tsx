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

import { SelectOption } from '../../../../../charts/public';
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
