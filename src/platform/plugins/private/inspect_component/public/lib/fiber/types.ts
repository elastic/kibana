/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentType } from 'react';

/**
 * Represents the content of _debugSource property on a {@link ReactFiberNode React Fiber node}.
 */
export interface DebugSource {
  /** Component definition column number. */
  columnNumber: number;
  /** Component definition line number. */
  lineNumber: number;
  /** Full file path. */
  fileName: string;
}

/**
 * Subset of React Fiber node properties needed for Inspect Component functionality.
 */
export interface ReactFiberNode {
  /** The resolved type of the component. */
  type: ComponentType | string;
  /** The type of the React element represented by this {@link ReactFiberNode React Fiber node}. */
  elementType?: string | null;
  /** {@link DebugSource} */
  _debugSource?: DebugSource;
  /**
   * The {@link ReactFiberNode React Fiber node} that created this node.
   */
  _debugOwner?: ReactFiberNode | null;
  /** The actual HTML element for host components, or component instance for class components. */
  stateNode?: HTMLElement | null;
  /** First child {@link ReactFiberNode React Fiber node}. */
  child?: ReactFiberNode | null;
  /** Next sibling {@link ReactFiberNode React Fiber node}. */
  sibling?: ReactFiberNode | null;
  /** Parent {@link ReactFiberNode React Fiber node}. */
  return?: ReactFiberNode | null;
  /** HTML element associated with the {@link ReactFiberNode React Fiber node}. */
  element?: HTMLElement;
}

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
