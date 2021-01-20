/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export const SCALE_MODES = {
  NORMAL: 'normal',
  PERCENTAGE: 'percentage',
  WIGGLE: 'wiggle',
  SILHOUETTE: 'silhouette',
  GROUPED: 'grouped', // this should not be a scale mode but it is at this point to make it compatible with old charts
  ALL: ['normal', 'percentage', 'wiggle', 'silhouette'],
};
