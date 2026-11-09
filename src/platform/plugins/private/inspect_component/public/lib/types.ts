/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * 'inspect' opens a flyout with component details,
 * 'grab' lets the element be dragged into a coding agent and copies its context to the clipboard.
 */
export type InspectMode = 'inspect' | 'grab';

/**
 * The display name of the closest user-defined React component and the associated HTML element.
 */
export interface SourceComponent {
  /** The component display name. */
  type: string;
  /** The HTML element associated with the component. */
  element: HTMLElement | null;
}

/**
 * Represents information about an EUI component.
 */
export interface EuiData {
  /** The React component display name of this EUI component. */
  componentType: string;
  /** Link to EUI documentation for this EUI component. */
  docsLink: string;
  /** EUI icon type for the icon inside this component. */
  iconType: string | null;
}
