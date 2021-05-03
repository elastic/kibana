/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

interface BaseColorRules {
  id: string | null;
  value?: number | null;
  operator?: string | null;
}

export type ColorRules = BaseColorRules & {
  text?: string | null;
};

export type BackgroundColorRules = BaseColorRules & {
  color?: string | null;
  background_color?: string | null;
};

export type BarColorRules = BaseColorRules & {
  bar_color?: string | null;
};

export type GaugeColorRules = ColorRules & {
  gauge?: string | null;
};
