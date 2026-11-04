/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Location of the JSX that created a fiber. Attached by `@babel/preset-react`
 * in development mode only.
 */
export interface DebugSource {
  /** Absolute path of the file containing the JSX. */
  fileName: string;
  lineNumber: number;
  columnNumber: number;
}

/**
 * Shape shared by function components, class components and the objects
 * `memo` and `forwardRef` wrap them in.
 */
interface FiberComponentShape {
  displayName?: string;
  name?: string;
  /** Wrapped component of a `forwardRef` type. */
  render?: FiberComponentType;
  /** Wrapped component of a `memo` type. */
  type?: FiberComponentType;
}

/** The component behind a fiber: a function or class, or the object `memo` / `forwardRef` wrap it in. */
export type FiberComponentType =
  | FiberComponentShape
  | (FiberComponentShape & (((...args: never[]) => unknown) | (new (...args: never[]) => unknown)));

/**
 * Subset of the React Fiber node properties used by this package.
 * The `_debug*` properties only exist in development builds of React.
 */
export interface ReactFiberNode {
  /** Tag name for host elements, the component for everything else. */
  type: string | FiberComponentType | null;
  elementType?: string | FiberComponentType | null;
  /** Parent in the fiber tree. */
  return?: ReactFiberNode | null;
  child?: ReactFiberNode | null;
  sibling?: ReactFiberNode | null;
  /** The DOM node of a host fiber, the instance of a class component or the root otherwise. */
  stateNode?: object | null;
  /** {@link DebugSource} */
  _debugSource?: DebugSource | null;
  /** The fiber whose render created this one. */
  _debugOwner?: ReactFiberNode | null;
}

/** A fiber that knows where its JSX was written. */
export type FiberWithDebugSource = ReactFiberNode & { _debugSource: DebugSource };

/** A DOM element paired with the closest fiber that has source information. */
export interface ElementFiber {
  element: HTMLElement;
  fiber: FiberWithDebugSource;
}

/** One entry of a component stack: a component and the location of the JSX it rendered. */
export interface ComponentStackFrame {
  name: string;
  source: DebugSource;
}
