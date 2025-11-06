/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { GaugeShape } from '@kbn/expression-gauge-plugin/common';

export const LENS_GAUGE_ID = 'lnsGauge';

export const GAUGE_SHAPES = {
  HORIZONTAL_BULLET: 'horizontalBullet',
  VERTICAL_BULLET: 'verticalBullet',
  SEMI_CIRCLE: 'semiCircle',
  ARC: 'arc',
  CIRCLE: 'circle',
} as const;

export const GAUGE_TICKS_POSITIONS = {
  HIDDEN: 'hidden',
  AUTO: 'auto',
  BANDS: 'bands',
} as const;

export const GAUGE_LABEL_MAJOR_MODES = {
  AUTO: 'auto',
  CUSTOM: 'custom',
  NONE: 'none',
} as const;

export const GAUGE_CENTRAL_MAJOR_MODES = {
  AUTO: 'auto',
  CUSTOM: 'custom',
  NONE: 'none',
} as const;

export const GAUGE_COLOR_MODES = {
  PALETTE: 'palette',
  NONE: 'none',
} as const;

export const LENS_GAUGE_GROUP_ID = {
  METRIC: 'metric',
  MIN: 'min',
  MAX: 'max',
  GOAL: 'goal',
} as const;

export const GAUGE_TITLES_BY_TYPE: Record<GaugeShape, string> = {
  [GAUGE_SHAPES.HORIZONTAL_BULLET]: i18n.translate('xpack.lens.gaugeHorizontal.gaugeLabel', {
    defaultMessage: 'Horizontal Bullet',
  }),
  [GAUGE_SHAPES.VERTICAL_BULLET]: i18n.translate('xpack.lens.gaugeVertical.gaugeLabel', {
    defaultMessage: 'Vertical Bullet',
  }),
  [GAUGE_SHAPES.SEMI_CIRCLE]: i18n.translate('xpack.lens.gaugeSemiCircle.gaugeLabel', {
    defaultMessage: 'Minor arc',
  }),
  [GAUGE_SHAPES.ARC]: i18n.translate('xpack.lens.gaugeArc.gaugeLabel', {
    defaultMessage: 'Major arc',
  }),
  [GAUGE_SHAPES.CIRCLE]: i18n.translate('xpack.lens.gaugeCircle.gaugeLabel', {
    defaultMessage: 'Circle',
  }),
};
