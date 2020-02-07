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

import { OverlayRef } from '../../../core/public';

/**
 * The interface that the adapters used to open an inspector have to fullfill.
 */
export interface Adapters {
  [key: string]: any;
}

/**
 * The props interface that a custom inspector view component, that will be passed
 * to {@link InspectorViewDescription#component}, must use.
 */
export interface InspectorViewProps {
  /**
   * Adapters used to open the inspector.
   */
  adapters: Adapters;
  /**
   * The title that the inspector is currently using e.g. a visualization name.
   */
  title: string;
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
 */
export interface InspectorOptions {
  title?: string;
}

export type InspectorSession = OverlayRef;
