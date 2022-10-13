/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { cloneDeep, get } from 'lodash';

import { EuiSpacer } from '@elastic/eui';
import { Position } from '@elastic/charts';

import { BUCKET_TYPES, IAggConfig } from '@kbn/data-plugin/public';
import { LEGACY_TIME_AXIS } from '@kbn/charts-plugin/common';
import { getUISettings } from '../../../../services';

import { VisParams, ValueAxis, SeriesParam, CategoryAxis } from '../../../../types';
import { ValidationVisOptionsProps } from '../../common';
import { SeriesPanel } from './series_panel';
import { CategoryAxisPanel } from './category_axis_panel';
import { ValueAxesPanel } from './value_axes_panel';
import {
  isAxisHorizontal,
  countNextAxisNumber,
  getUpdatedAxisName,
  mapPositionOpposite,
  mapPosition,
  mapPositionOpposingOpposite,
} from './utils';
import { getSeriesParams } from '../../../../utils/get_series_params';

export type SetParamByIndex = <P extends keyof ValueAxis, O extends keyof SeriesParam>(
  axesName: 'valueAxes' | 'seriesParams',
  index: number,
  paramName: P | O,
  value: ValueAxis[P] | SeriesParam[O]
) => void;

export type ChangeValueAxis = (
  index: number,
  paramName: 'valueAxis',
  selectedValueAxis: string
) => void;

const VALUE_AXIS_PREFIX = 'ValueAxis-';

function MetricsAxisOptions(props: ValidationVisOptionsProps<VisParams>) {
  const { stateParams, setValue, aggs, vis, isTabSelected } = props;

  const setParamByIndex: SetParamByIndex = useCallback(
    (axesName, index, paramName, value) => {
      const items = stateParams[axesName];
      const array = [...items] as typeof items;

      array[index] = {
        ...array[index],
        [paramName]: value,
      };

      setValue(axesName, array);
    },
    [stateParams, setValue]
  );

  const setCategoryAxis = useCallback(
    (value: CategoryAxis) => {
      const categoryAxes = [...stateParams.categoryAxes];
      categoryAxes[0] = value;
      setValue('categoryAxes', categoryAxes);
    },
    [setValue, stateParams.categoryAxes]
  );

  // stores previous aggs' custom labels
  const [lastCustomLabels, setLastCustomLabels] = useState({} as { [key: string]: string });
  // stores previous aggs' field and type
  const [lastSeriesAgg, setLastSeriesAgg] = useState(
    {} as {
      [key: string]: { type: string; field: string };
    }
  );

  const updateAxisTitle = useCallback(
    (seriesParams?: SeriesParam[]) => {
      const series = seriesParams || stateParams.seriesParams;
      let isAxesChanged = false;
      let lastValuesChanged = false;
      const lastLabels = { ...lastCustomLabels };
      const lastMatchingSeriesAgg = { ...lastSeriesAgg };

      const axes = stateParams.valueAxes.map((axis, axisNumber) => {
        let newCustomLabel = '';
        let updatedAxis;
        const matchingSeries: IAggConfig[] = [];

        series.forEach((serie, seriesIndex) => {
          if ((axisNumber === 0 && !serie.valueAxis) || serie.valueAxis === axis.id) {
            const aggByIndex = aggs.bySchemaName('metric')[seriesIndex];
            matchingSeries.push(aggByIndex);
          }
        });

        if (matchingSeries.length === 1) {
          // if several series matches to the axis, axis title is set according to the first serie.
          newCustomLabel = matchingSeries[0].makeLabel();
        }

        if (lastCustomLabels[axis.id] !== newCustomLabel && newCustomLabel !== '') {
          const lastSeriesAggType = get(lastSeriesAgg, `${matchingSeries[0].id}.type`);
          const lastSeriesAggField = get(lastSeriesAgg, `${matchingSeries[0].id}.field`);
          const matchingSeriesAggType = get(matchingSeries, '[0]type.name', '');
          const matchingSeriesAggField = get(matchingSeries, '[0]params.field.name', '');

          const aggTypeIsChanged = lastSeriesAggType !== matchingSeriesAggType;
          const aggFieldIsChanged = lastSeriesAggField !== matchingSeriesAggField;

          lastMatchingSeriesAgg[matchingSeries[0].id] = {
            type: matchingSeriesAggType,
            field: matchingSeriesAggField,
          };
          lastLabels[axis.id] = newCustomLabel;
          lastValuesChanged = true;

          if (
            Object.keys(lastCustomLabels).length !== 0 &&
            (aggTypeIsChanged ||
              aggFieldIsChanged ||
              axis.title.text === '' ||
              lastCustomLabels[axis.id] === axis.title.text) &&
            newCustomLabel !== axis.title.text
          ) {
            // Override axis title with new custom label
            updatedAxis = {
              ...axis,
              title: { ...axis.title, text: newCustomLabel },
            };
            isAxesChanged = true;
          }
        }

        return updatedAxis || axis;
      });

      if (isAxesChanged) {
        setValue('valueAxes', axes);
      }

      if (lastValuesChanged) {
        setLastSeriesAgg(lastMatchingSeriesAgg);
        setLastCustomLabels(lastLabels);
      }
    },
    [
      aggs,
      lastCustomLabels,
      lastSeriesAgg,
      setValue,
      stateParams.seriesParams,
      stateParams.valueAxes,
    ]
  );

  const onValueAxisPositionChanged = useCallback(
    (index: number, axisPosition: ValueAxis['position']) => {
      const isHorizontalAxis = isAxisHorizontal(axisPosition);
      const valueAxes = [...stateParams.valueAxes];
      const name = getUpdatedAxisName(axisPosition, valueAxes);
      const [categoryAxes] = stateParams.categoryAxes;

      if (isAxisHorizontal(categoryAxes.position) === isHorizontalAxis) {
        const updatedCategoryAxes = {
          ...categoryAxes,
          position: mapPosition(categoryAxes.position),
        };

        setValue('categoryAxes', [updatedCategoryAxes]);

        const oldPosition = valueAxes[index].position;
        const newValueAxes = valueAxes.map(({ position, ...axis }, i) => ({
          ...axis,
          position:
            i === index
              ? axisPosition
              : mapPositionOpposingOpposite(position, oldPosition, axisPosition),
        }));
        setValue('valueAxes', newValueAxes);
      } else {
        valueAxes[index] = {
          ...valueAxes[index],
          name,
          position: axisPosition,
        };
        setValue('valueAxes', valueAxes);
      }
    },
    [stateParams.valueAxes, stateParams.categoryAxes, setValue]
  );

  const onCategoryAxisPositionChanged = useCallback(
    (axisPosition: CategoryAxis['position']) => {
      const isHorizontalAxis = isAxisHorizontal(axisPosition);

      if (
        stateParams.valueAxes.some(
          ({ position }) => isAxisHorizontal(position) === isHorizontalAxis
        )
      ) {
        const newValueAxes = stateParams.valueAxes.map(({ position, ...axis }) => ({
          ...axis,
          position: mapPosition(position),
        }));
        setValue('valueAxes', newValueAxes);
      }
    },
    [setValue, stateParams.valueAxes]
  );

  const addValueAxis = useCallback(() => {
    const nextAxisIdNumber = stateParams.valueAxes.reduce(
      countNextAxisNumber(VALUE_AXIS_PREFIX),
      1
    );

    const newAxis = cloneDeep(stateParams.valueAxes[0]);
    newAxis.id = VALUE_AXIS_PREFIX + nextAxisIdNumber;
    newAxis.position = mapPositionOpposite(newAxis.position);
    newAxis.name = getUpdatedAxisName(newAxis.position, stateParams.valueAxes);

    setValue('valueAxes', [...stateParams.valueAxes, newAxis]);
    return newAxis;
  }, [stateParams.valueAxes, setValue]);

  const removeValueAxis = useCallback(
    (axis: ValueAxis) => {
      const newValueAxes = stateParams.valueAxes.filter((valAxis) => valAxis.id !== axis.id);

      setValue('valueAxes', newValueAxes);

      let isSeriesUpdated = false;
      const series = stateParams.seriesParams.map((ser) => {
        if (axis.id === ser.valueAxis) {
          isSeriesUpdated = true;
          return { ...ser, valueAxis: newValueAxes[0].id };
        }
        return ser;
      });

      if (isSeriesUpdated) {
        // if seriesParams have valueAxis equals to removed one, then we reset it to the first valueAxis
        setValue('seriesParams', series);
      }

      if (stateParams.grid.valueAxis === axis.id) {
        // reset Y-axis grid lines setting
        setValue('grid', { ...stateParams.grid, valueAxis: undefined });
      }
    },
    [stateParams.seriesParams, stateParams.valueAxes, setValue, stateParams.grid]
  );

  const changeValueAxis: ChangeValueAxis = useCallback(
    (index, paramName, selectedValueAxis) => {
      let newValueAxis = selectedValueAxis;
      if (selectedValueAxis === 'new') {
        const axis = addValueAxis();
        newValueAxis = axis.id;
      }

      setParamByIndex('seriesParams', index, paramName, newValueAxis);

      updateAxisTitle();
    },
    [addValueAxis, setParamByIndex, updateAxisTitle]
  );

  const schemaName = vis.type.schemas.metrics[0].name;
  const firstValueAxesId = stateParams.valueAxes[0].id;

  useEffect(() => {
    const updatedSeries = getSeriesParams(
      aggs,
      stateParams.seriesParams,
      schemaName,
      firstValueAxesId
    );

    if (updatedSeries) setValue('seriesParams', updatedSeries);
    updateAxisTitle(updatedSeries);
  }, [firstValueAxesId, setValue, stateParams.seriesParams, updateAxisTitle, aggs, schemaName]);

  const isTimeViz = aggs.aggs.some(
    (agg) =>
      agg.schema === 'segment' && agg.enabled && agg.type?.name === BUCKET_TYPES.DATE_HISTOGRAM
  );
  const xAxisIsHorizontal =
    stateParams.categoryAxes[0].position === Position.Bottom ||
    stateParams.categoryAxes[0].position === Position.Top;
  const useLegacyTimeAxis = getUISettings().get(LEGACY_TIME_AXIS, false);
  const linearOrStackedBars = stateParams.seriesParams.every(
    ({ mode, type }) => type !== 'histogram' || (type === 'histogram' && mode === 'stacked')
  );
  const useMultiLayerAxis =
    xAxisIsHorizontal && isTimeViz && !useLegacyTimeAxis && linearOrStackedBars;

  return isTabSelected ? (
    <>
      <SeriesPanel
        changeValueAxis={changeValueAxis}
        setParamByIndex={setParamByIndex}
        seriesParams={stateParams.seriesParams}
        valueAxes={stateParams.valueAxes}
        vis={vis}
      />
      <EuiSpacer size="s" />
      <ValueAxesPanel
        addValueAxis={addValueAxis}
        removeValueAxis={removeValueAxis}
        onValueAxisPositionChanged={onValueAxisPositionChanged}
        setParamByIndex={setParamByIndex}
        setMultipleValidity={props.setMultipleValidity}
        seriesParams={stateParams.seriesParams}
        valueAxes={stateParams.valueAxes}
      />
      <EuiSpacer size="s" />
      <CategoryAxisPanel
        axis={stateParams.categoryAxes[0]}
        onPositionChanged={onCategoryAxisPositionChanged}
        setCategoryAxis={setCategoryAxis}
        useMultiLayerAxis={useMultiLayerAxis}
      />
    </>
  ) : null;
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { MetricsAxisOptions as default };
