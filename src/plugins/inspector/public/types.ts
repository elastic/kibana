/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OverlayRef } from '@kbn/core/public';
import { Adapters } from '../common';

/**
 * The props interface that a custom inspector view component, that will be passed
 * to {@link InspectorViewDescription#component}, must use.
 */
export interface InspectorViewProps<TAdapters extends Adapters = Adapters> {
  /**
   * Adapters used to open the inspector.
   */
  adapters: TAdapters;
  /**
   * The title that the inspector is currently using e.g. a visualization name.
   */
  title: string;
  /**
   * A set of specific options for each view.
   */
  options?: unknown;
}

/**
 * An object describing an inspector view.
 * @typedef {object} InspectorViewDescription
 * @property {string} title - The title that will be used to present that view.
 * @property {string} icon - An icon name to present this view. Must match an EUI icon.
 * @property {React.ComponentType<InspectorViewProps>} component - The actual React component to render that view.
 * @property {number} [order=9000] - An order for this view. Views are ordered from lower
 *    order values to higher order values in the UI.
 * @property {string} [help=''] - An help text for this view, that gives a brief description
 *    of this view.
 * @property {viewShouldShowFunc} [shouldShow] - A function, that determines whether
 *    this view should be visible for a given collection of adapters. If not specified
 *    the view will always be visible.
 */
export interface InspectorViewDescription {
  component: React.ComponentType<InspectorViewProps>;
  help?: string;
  order?: number;
  shouldShow?: (adapters: Adapters) => boolean;
  title: string;
}

/**
 * Options that can be specified when opening the inspector.
 * @property {string} title - An optional title, that will be shown in the header
 *    of the inspector. Can be used to give more context about what is being inspected.
 * @property {unknown} options - A set of specific payload to be passed to inspector views
 */
export interface InspectorOptions {
  title?: string;
  options?: unknown;
}

export type InspectorSession = OverlayRef;
