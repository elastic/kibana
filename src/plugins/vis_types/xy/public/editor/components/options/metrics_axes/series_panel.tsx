/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiPanel, EuiTitle, EuiSpacer, EuiAccordion } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { Vis } from '@kbn/visualizations-plugin/public';

import { ValueAxis, SeriesParam } from '../../../../types';
import { ChartOptions } from './chart_options';
import { SetParamByIndex, ChangeValueAxis } from '.';

export interface SeriesPanelProps {
  changeValueAxis: ChangeValueAxis;
  setParamByIndex: SetParamByIndex;
  seriesParams: SeriesParam[];
  valueAxes: ValueAxis[];
  vis: Vis;
}

function SeriesPanel({ seriesParams, ...chartProps }: SeriesPanelProps) {
  return (
    <EuiPanel paddingSize="s">
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="visTypeXy.controls.pointSeries.series.metricsTitle"
            defaultMessage="Metrics"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      {seriesParams.map((chart, index) => (
        <EuiAccordion
          id={`visEditorSeriesAccordion${chart.data.id}`}
          key={index}
          className="visEditorSidebar__section visEditorSidebar__collapsible"
          initialIsOpen={index === 0}
          buttonContent={chart.data.label}
          buttonContentClassName="visEditorSidebar__aggGroupAccordionButtonContent eui-textTruncate"
          aria-label={i18n.translate('visTypeXy.controls.pointSeries.seriesAccordionAriaLabel', {
            defaultMessage: 'Toggle {agg} options',
            values: { agg: chart.data.label },
          })}
        >
          <>
            <EuiSpacer size="m" />

            <ChartOptions index={index} chart={chart} {...chartProps} />
          </>
        </EuiAccordion>
      ))}
    </EuiPanel>
  );
}

export { SeriesPanel };
