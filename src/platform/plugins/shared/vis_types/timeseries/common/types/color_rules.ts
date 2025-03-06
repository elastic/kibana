/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

interface BaseColorRules {
  id: string | null;
  value?: number;
  operator?: string;
}

export type ColorRules = BaseColorRules & {
  text?: string;
};

export type BackgroundColorRules = BaseColorRules & {
  color?: string;
  background_color?: string;
};

export type BarColorRules = BaseColorRules & {
  bar_color?: string;
};

export type GaugeColorRules = ColorRules & {
  gauge?: string;
};
