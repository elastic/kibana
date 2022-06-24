/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CurveType } from '@elastic/charts';

const DEFAULT_COLOR = '#000';

export const getAreaStyles = ({ points, lines, color }) => ({
  areaSeriesStyle: {
    line: {
      stroke: color,
      strokeWidth: Number(lines.lineWidth) || 0,
      visible: Boolean(lines.show && lines.lineWidth),
    },
    area: {
      fill: color,
      opacity: lines.fill <= 0 ? 0 : lines.fill,
      visible: Boolean(lines.show),
    },
    point: {
      radius: points.radius || 0.5,
      stroke: color || DEFAULT_COLOR,
      strokeWidth: points.lineWidth || 5,
      visible: points.lineWidth > 0 && Boolean(points.show),
    },
  },
  curve: lines.steps ? CurveType.CURVE_STEP_AFTER : CurveType.LINEAR,
});

export const getBarStyles = ({ show = true, lineWidth = 0, fill = 1 }, color) => ({
  barSeriesStyle: {
    rectBorder: {
      stroke: color || DEFAULT_COLOR,
      strokeWidth: lineWidth,
      visible: show,
    },
    rect: {
      fill: color || DEFAULT_COLOR,
      opacity: fill,
    },
  },
});
