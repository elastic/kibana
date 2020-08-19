/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
  /**
   * Overall number of series in the current chart
   */
  totalSeries: number;
  /**
   * Max nesting depth of the series tree
   */
  maxDepth: number;
  /**
   * Flag whether the color will be used behind text
   */
  behindText: boolean;
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
   * Serialize the internal state of the palette into an expression function.
   * This function should be used to pass the palette to the expression function applying color and other styles
   * @param state The internal state of the palette
   */
  toExpression?: (state?: T) => Ast;
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
  getColor: (series: SeriesLayer[], state?: T) => string | null;
  getColors: (size: number, state?: T) => string[];
}
