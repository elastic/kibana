/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiPanel, EuiTitle, EuiSpacer } from '@elastic/eui';
import { Position } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  BasicOptions,
  SwitchOption,
  LongLegendOptions,
  LegendSizeSettings,
} from '../../../../../../../vis_default_editor/public';
import { BUCKET_TYPES } from '../../../../../../../data/public';

import { VisParams } from '../../../../types';
import { GridPanel } from './grid_panel';
import { ThresholdPanel } from './threshold_panel';
import { ChartType } from '../../../../../common';
import { ValidationVisOptionsProps } from '../../common';
import { ElasticChartsOptions } from './elastic_charts_options';
import { getPositions } from '../../../collections';

const legendPositions = getPositions();

export function PointSeriesOptions(props: ValidationVisOptionsProps<VisParams>) {
  const { stateParams, setValue, vis, aggs } = props;
  const hasBarChart = useMemo(
    () =>
      stateParams.seriesParams.some(
        ({ type, data: { id: paramId } }) =>
          type === ChartType.Histogram && aggs.aggs.find(({ id }) => id === paramId)?.enabled
      ),
    [stateParams.seriesParams, aggs.aggs]
  );

  const handleLegendSizeChange = useCallback((size) => setValue('legendSize', size), [setValue]);

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

        <BasicOptions {...props} legendPositions={legendPositions} />
        <LongLegendOptions
          data-test-subj="xyLongLegendsOptions"
          truncateLegend={stateParams.truncateLegend ?? true}
          maxLegendLines={stateParams.maxLegendLines ?? 1}
          setValue={setValue}
        />
        <LegendSizeSettings
          legendSize={stateParams.legendSize}
          onLegendSizeChange={handleLegendSizeChange}
          isVerticalLegend={
            stateParams.legendPosition === Position.Left ||
            stateParams.legendPosition === Position.Right
          }
        />

        {vis.data.aggs!.aggs.some(
          (agg) => agg.schema === 'segment' && agg.type.name === BUCKET_TYPES.DATE_HISTOGRAM
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

        {hasBarChart && (
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

        <ElasticChartsOptions {...props} />
      </EuiPanel>

      <EuiSpacer size="s" />

      <GridPanel {...props} />

      <EuiSpacer size="s" />

      {stateParams.thresholdLine && <ThresholdPanel {...props} />}
    </>
  );
}
