/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import classNames from 'classnames';
import { getDisplayName } from './lib/get_display_name';
import { labelDateFormatter } from './lib/label_date_formatter';
import { findIndex, first } from 'lodash';
import { getValueOrEmpty } from '../../../common/empty_label';
import { getSplitByTermsColor } from '../lib/get_split_by_terms_color';
import { SERIES_SEPARATOR } from '../../../common/constants';

export function visWithSplits(WrappedComponent) {
  function SplitVisComponent(props) {
    const { model, visData, syncColors, palettesService, fieldFormatMap } = props;

    const getSeriesColor = useCallback(
      (seriesName, seriesId, baseColor) => {
        const palette = {
          ...model.series[0].palette,
          name:
            model.series[0].split_color_mode === 'kibana'
              ? 'kibana_palette'
              : model.series[0].split_color_mode || model.series[0].palette.name,
        };
        const props = {
          seriesById: visData[model.id].series,
          seriesName,
          seriesId,
          baseColor,
          seriesPalette: palette,
          palettesRegistry: palettesService,
          syncColors,
          fieldFormatMap,
        };
        return getSplitByTermsColor(props) || null;
      },
      [fieldFormatMap, model.id, model.series, palettesService, syncColors, visData]
    );

    if (!model || !visData || !visData[model.id]) return <WrappedComponent {...props} />;
    if (visData[model.id].series.every((s) => s.id.split(SERIES_SEPARATOR).length === 1)) {
      return <WrappedComponent {...props} />;
    }

    const splitsVisData = visData[model.id].series.reduce((acc, series) => {
      const [seriesId, splitId] = series.id.split(SERIES_SEPARATOR);
      const seriesModel = model.series.find((s) => s.id === seriesId);
      if (!seriesModel) return acc;

      const label = series.splitByLabel;

      if (!acc[splitId]) {
        acc[splitId] = {
          series: [],
          label: series.label.toString(),
          labelFormatted: series.labelFormatted,
        };
      }

      const labelHasKeyPlaceholder = /{{\s*key\s*}}/.test(seriesModel.label);
      const color = series.color || seriesModel.color;
      const finalColor =
        model.series[0].split_mode === 'terms' ? getSeriesColor(label, series.id, color) : color;

      acc[splitId].series.push({
        ...series,
        id: seriesId,
        color: finalColor,
        label: seriesModel.label && !labelHasKeyPlaceholder ? seriesModel.label : label,
      });
      return acc;
    }, {});

    const nonSplitSeries = first(
      visData[model.id].series.filter((series) => {
        const seriesModel = model.series.find((s) => s.id === series.id);
        if (!seriesModel) return false;
        return ['everything', 'filter'].includes(seriesModel.split_mode);
      })
    );

    const indexOfNonSplit = nonSplitSeries
      ? findIndex(model.series, (s) => s.id === nonSplitSeries.id)
      : null;

    const rows = Object.keys(splitsVisData).map((key) => {
      const splitData = splitsVisData[key];
      const { series, label, labelFormatted } = splitData;
      let additionalLabel = label;
      if (labelFormatted) {
        additionalLabel = labelDateFormatter(labelFormatted);
      }
      const newSeries =
        indexOfNonSplit != null && indexOfNonSplit > 0
          ? [...series, nonSplitSeries]
          : [nonSplitSeries, ...series];
      const newVisData = {
        [model.id]: {
          id: model.id,
          series: newSeries || series,
        },
      };
      return (
        <div key={key} className="tvbSplitVis__split">
          <WrappedComponent
            model={model}
            visData={newVisData}
            onBrush={props.onBrush}
            onFilterClick={props.onFilterClick}
            additionalLabel={getValueOrEmpty(additionalLabel)}
            backgroundColor={props.backgroundColor}
            getConfig={props.getConfig}
            fieldFormatMap={props.fieldFormatMap}
          />
        </div>
      );
    });

    const hasOneVis = visData[model.id].series.length === 1;

    return (
      <div className={classNames('tvbSplitVis', { 'tvbSplitVis--one': hasOneVis })}>{rows}</div>
    );
  }

  SplitVisComponent.displayName = `SplitVisComponent(${getDisplayName(WrappedComponent)})`;
  return SplitVisComponent;
}
