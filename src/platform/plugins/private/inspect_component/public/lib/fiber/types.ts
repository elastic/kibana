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
 * Represents the content of _debugSource property on a React Fiber node.
 */
export interface DebugSource {
  /** Component definition column number. */
  columnNumber: number;
  /** Component definition line number. */
  lineNumber: number;
  /** Full component path. */
  fileName: string;
}

/**
 * The subset of React Fiber node properties we care about, extended
 * for DOM traversal and Fiber tree navigation.
 */
export interface ReactFiberNode {
  /** The resolved type of the component. */
  type: ComponentType | string;
  /** The type of the React element represented by this Fiber node. */
  elementType?: string | null;
  /** Metadata about the source file where this Fiber was created. */
  _debugSource?: DebugSource;
  /** The Fiber node that created this node. */
  _debugOwner?: ReactFiberNode | null;
  /** The actual HTML element for host components, or component instance for class components. */
  stateNode?: HTMLElement | null;
  /** First child Fiber node. */
  child?: ReactFiberNode | null;
  /** Next sibling Fiber node. */
  sibling?: ReactFiberNode | null;
  /** Parent Fiber node. */
  return?: ReactFiberNode | null;
}

export interface ReactFiberNodeWithHtmlElement extends ReactFiberNode {
  /** Metadata about the source file where this Fiber was created. */
  _debugSource: DebugSource;
  /** HTML element associated with the Fiber node. */
  element: HTMLElement;
}

/**
 * The name of the top-level React component and the associated HTML element.
 */
export interface SourceComponent {
  /** The component name. */
  type: string;
  /** The HTML element associated with the source component. */
  element: HTMLElement | null;
}

/**
 * Represents information about an EUI component.
 */
export interface EuiData {
  /** The React component name of this EUI component. */
  componentType: string;
  /** Link to the EUI documentation for this EUI component. */
  docsLink: string;
  /** The EUI icon type for the icon inside this component. */
  iconType: string | null;
}
