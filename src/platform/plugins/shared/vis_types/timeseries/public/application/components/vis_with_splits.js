/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import classNames from 'classnames';
import { findIndex, first } from 'lodash';

import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

import { getDisplayName } from './lib/get_display_name';
import { getValueOrEmpty } from '../../../common/empty_label';
import { getSplitByTermsColor } from '../lib/get_split_by_terms_color';
import { SERIES_SEPARATOR } from '../../../common/constants';

const splitVisStyle = css`
  width: 100%;
  display: flex;
  /* Allow wrapping beyond 4 in a row */
  flex-wrap: wrap;
  /* Space out each vis instead of clumping in the center to utilize more horizontal space */
  justify-content: space-around;
  /* Stretch all the heights so that prior to wrapping the vis' take up the full panel height */
  align-items: stretch;
`;

const splitVisOneStyle = css`
  flex: 1;

  .tvbSplitVis__split {
    min-width: 0;

    > .tvbVis {
      min-height: 0;
    }
  }
`;

const useSplitVisItemStyle = () => {
  const { euiTheme } = useEuiTheme();
  const styles = useMemo(() => {
    return css`
      /* This maintains that each vis will be at least 1/4 of the panel's width
        but it will also grow to fill the space if there are less than 4 in a row */
      flex: 1 0 25%;
      /* Ensure a minimum width is achieved on smaller width panels */
      min-width: calc(${euiTheme.size.base} * 12);
      display: flex;

      > .tvbVis {
        /* Apply the minimum height on the vis itself so it doesn't interfere with flex calculations
          Gauges are not completely square, so the height is just slightly less than the width */
        min-height: calc(${euiTheme.size.base} * 12 / 1.25);
      }
    `;
  }, [euiTheme]);
  return styles;
};

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

    const splitVisItemStyle = useSplitVisItemStyle();

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

    const rows = Object.keys(splitsVisData).map((key, index, arrayRef) => {
      const splitData = splitsVisData[key];
      const { series, label } = splitData;
      const additionalLabel = label;

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
        <div key={key} className="tvbSplitVis__split" css={splitVisItemStyle}>
          <WrappedComponent
            model={model}
            visData={newVisData}
            onBrush={props.onBrush}
            onFilterClick={props.onFilterClick}
            additionalLabel={getValueOrEmpty(additionalLabel)}
            backgroundColor={props.backgroundColor}
            getConfig={props.getConfig}
            fieldFormatMap={props.fieldFormatMap}
            initialRender={arrayRef.length - 1 === index ? props.initialRender : undefined}
          />
        </div>
      );
    });

    const hasOneVis = visData[model.id].series.length === 1;

    return (
      <div
        className={classNames('tvbSplitVis', { 'tvbSplitVis--one': hasOneVis })}
        css={[splitVisStyle, hasOneVis && splitVisOneStyle]}
      >
        {rows}
      </div>
    );
  }

  SplitVisComponent.displayName = `SplitVisComponent(${getDisplayName(WrappedComponent)})`;
  return SplitVisComponent;
}
