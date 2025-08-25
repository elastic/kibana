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
 * for DOM traversal and fiber tree navigation.
 */
export interface ReactFiberNode {
  /** The type of the React element represented by this Fiber node. */
  elementType: string | null;
  /** The resolved type of the component. */
  type: ComponentType | string;
  /** Metadata about the source file where this Fiber was created. */
  _debugSource?: DebugSource;
  /** The Fiber node that created this node. */
  _debugOwner?: ReactFiberNode | null;
  /** The actual DOM element for host components, or component instance for class components. */
  stateNode?: HTMLElement | null;
  /** First child Fiber node. */
  child?: ReactFiberNode | null;
  /** Next sibling Fiber node. */
  sibling?: ReactFiberNode | null;
  /** Parent Fiber node. */
  return?: ReactFiberNode | null;
}
