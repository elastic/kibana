/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { TooltipType } from '@elastic/charts';

import { Aspects, VisParams, TooltipConfig } from '../types';
import { getDetailedTooltip } from '../components/detailed_tooltip';

export function getTooltip(
  aspects: Aspects,
  { addTooltip, detailedTooltip }: VisParams
): TooltipConfig {
  return {
    type: addTooltip ? TooltipType.VerticalCursor : TooltipType.None,
    detailedTooltip: detailedTooltip ? getDetailedTooltip(aspects) : undefined,
  };
}
