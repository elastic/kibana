/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import type { IWaterfallLegend } from '@kbn/apm-types';
import { WaterfallLegendType } from '@kbn/apm-types';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Legend } from '../timeline/legend';

interface Props {
  serviceName?: string;
  legends: IWaterfallLegend[];
  type: WaterfallLegendType;
}

const LEGEND_LABELS = {
  [WaterfallLegendType.ServiceName]: i18n.translate(
    'apmUiShared.transactionDetails.servicesTitle',
    {
      defaultMessage: 'Services',
    }
  ),
  [WaterfallLegendType.Type]: i18n.translate('apmUiShared.transactionDetails.typeLegendTitle', {
    defaultMessage: 'Type',
  }),
};
export function WaterfallLegends({ serviceName, legends, type }: Props) {
  const displayedLegends = legends.filter((legend) => legend.type === type);

  const legendsWithFallbackLabel = displayedLegends.map((legend) => {
    return { ...legend, value: legend?.value || serviceName };
  });

  return (
    <EuiFlexGroup alignItems="center" gutterSize="m" wrap>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxxs">
          <span>{LEGEND_LABELS[type]}</span>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row" gutterSize="s">
          {legendsWithFallbackLabel.map((legend) => (
            <EuiFlexItem grow={false} key={legend.value}>
              <Legend color={legend.color} text={legend.value} />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
