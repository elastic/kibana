/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Ast } from '@kbn/interpreter/common';

/**
 * Information about a series in a chart used to determine its color.
 * Series layers can be nested, this means each series layer can have an ancestor.
 */
export interface SeriesLayer {
  /**
   * Name of the series (can be used for lookup-based coloring)
   */
  name: string;
  /**
   * Rank of the series compared to siblings with the same ancestor
   */
  rankAtDepth: number;
  /**
   * Total number of series with the same ancestor
   */
  totalSeriesAtDepth: number;
}

/**
 * Information about the structure of a chart to determine the color of a series within it.
 */
export interface ChartColorConfiguration {
  /**
   * Overall number of series in the current chart
   */
  totalSeries?: number;
  /**
   * Max nesting depth of the series tree
   */
  maxDepth?: number;
  /**
   * Flag whether the color will be used behind text. The palette can use this information to
   * adjust colors for better a11y. Might be ignored depending on the palette.
   */
  behindText?: boolean;
  /**
   * Flag whether a color assignment to a given key should be remembered and re-used the next time the key shows up.
   * This setting might be ignored based on the palette.
   */
  syncColors?: boolean;
}

/**
 * Definition of a global palette.
 *
 * A palette controls the appearance of Lens charts on an editor level.
 * The palette wont get reset when switching charts.
 *
 * A palette can hold internal state (e.g. for customizations) and also includes
 * an editor component to edit the internal state.
 */
export interface PaletteDefinition<T = unknown> {
  /**
   * Unique id of the palette (this will be persisted along with the visualization state)
   */
  id: string;
  /**
   * User facing title (should be i18n-ized)
   */
  title: string;
  /**
   * Flag indicating whether users should be able to pick this palette manually.
   */
  internal?: boolean;
  /**
   * Serialize the internal state of the palette into an expression function.
   * This function should be used to pass the palette to the expression function applying color and other styles
   * @param state The internal state of the palette
   */
  toExpression: (state?: T) => Ast;
  /**
   * Renders the UI for editing the internal state of the palette.
   * Not each palette has to feature an internal state, so this is an optional property.
   * @param domElement The dom element to the render the editor UI into
   * @param props Current state and state setter to issue updates
   */
  renderEditor?: (
    domElement: Element,
    props: { state?: T; setState: (updater: (oldState: T) => T) => void }
  ) => void;
  /**
   * Color a series according to the internal rules of the palette.
   * @param series The current series along with its ancestors.
   * @param state  The internal state of the palette
   */
  getColor: (
    series: SeriesLayer[],
    chartConfiguration?: ChartColorConfiguration,
    state?: T
  ) => string | null;
  /**
   * Get a spectrum of colors of the current palette.
   * This can be used if the chart wants to control color assignment locally.
   */
  getColors: (size: number, state?: T) => string[];
}

export interface PaletteRegistry {
  get: (name: string) => PaletteDefinition<unknown>;
  getAll: () => Array<PaletteDefinition<unknown>>;
}
