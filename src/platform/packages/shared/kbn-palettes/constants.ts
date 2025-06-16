/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const DEFAULT_FALLBACK_PALETTE = 'default' as const;

export const EUI_THEME_AMSTERDAM = 'EUI_THEME_AMSTERDAM';
export const EUI_THEME_BOREALIS = 'EUI_THEME_BOREALIS';

const semantic = {
  /**
   * Log level palette
   */
  LogLevel: 'log_level' as const,
};

const categorical = {
  /**
   * Default kibana theme
   */
  Default: DEFAULT_FALLBACK_PALETTE,
  /**
   * Neutral palette
   */
  Neutral: 'neutral' as const,

  // ---- Legacy Palettes ----
  /**
   * Kibana legacy theme v7 to v9
   */
  Kibana7: 'eui_amsterdam' as const,
  /**
   * Kibana behind text legacy theme v7 to v9
   */
  Kibana7BehindText: 'behind_text' as const,
  /**
   * Kibana legacy theme v4 to v7
   */
  Kibana4: 'kibana_v7_legacy' as const,
  /**
   * Elastic classic color palette
   */
  ElasticClassic: 'elastic_brand_2023' as const,
};

const gradient = {
  Cool: 'cool' as const,
  Gray: 'gray' as const,
  Red: 'red' as const,
  Green: 'green' as const,
  Warm: 'warm' as const,
  Temperature: 'temperature' as const,
  Complementary: 'complementary' as const,
  Status: 'status' as const,
  CompareTo: 'compare_to' as const,
};

/**
 * Enum of all kbn palette ids, including by type
 */
export const KbnPalette = {
  // Categorical palettes
  ...categorical,

  // Gradient palettes
  ...gradient,

  // Semantic palettes
  ...semantic,

  // ---- Deprecated palettes ----
  /**
   * Amsterdam theme
   * @deprecated use `KbnPalette.kibana7`
   */
  Amsterdam: 'eui_amsterdam_color_blind' as const,
};
