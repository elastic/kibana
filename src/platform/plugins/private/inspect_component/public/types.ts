/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, OverlayRef } from '@kbn/core/public';
import type { Dispatch, SetStateAction } from 'react';

/**
 * Response type for POST "/internal/inspect_component/inspect" route.
 */
export interface InspectComponentResponse {
  /** List of all teams who are codeowners for the specified file. */
  codeowners: string[];
  /** File path relative to the repository root. */
  relativePath: string;
  /** File name with extension. */
  baseFileName: string;
}

/**
 * Represents the content of _debugSource property on a React Fiber node.
 */
export interface FileData {
  /** Component definition column number. */
  columnNumber: number;
  /** Component definition line number. */
  lineNumber: number;
  /** Full path to the component (including root). */
  fileName: string;
}

/**
 * Represents the name information associated with a React Fiber node.
 */
export interface ReactFiberName {
  /** The display name of the component. */
  displayName?: string;
  /** The actual name of the function or class component. */
  name?: string;
}

/**
 * The subset of React Fiber node properties we care about.
 */
export interface ReactFiberNode {
  /** Metadata about the source file where this Fiber was created.
   * @see {@link FileData}
   */
  _debugSource?: FileData;
  /** The Fiber node that created this node. */
  _debugOwner?: ReactFiberNode | null;
  /** The type of the React element represented by this Fiber node. */
  elementType: string | null;
  /** The resolved type of the component.
   * @see {@link ReactFiberName}
   */
  type: string | ReactFiberName;
}

/**
 * Represents information about an EUI component.
 */
export interface EuiInfo {
  /** The React component name of this EUI component. */
  componentName: string;
  /** Link to the EUI documentation for this EUI component. */
  docsLink: string;
}

/**
 * Represents information about an component.
 */
export interface ComponentData extends FileData, InspectComponentResponse {
  /** List of all teams who are codeowners for specified file. */
  codeowners: string[];
  /**
   * Represents information about an EUI component.
   * @see {@link EuiInfo}
   */
  euiInfo: EuiInfo;
  /** The EUI name of the icon inside this component. */
  iconType?: string;
  /** A base64 encoded image string representing a screenshot of the component. */
  image?: string | null;
  /** The name of the top level React component. */
  sourceComponent?: string;
}

/**
 * Options for the `getComponentData` function.
 */
export interface GetComponentDataOptions {
  /** Kibana Core Start services. */
  core: CoreStart;
  /**
   * Represents information about an EUI component.
   * @see {@link EuiInfo}
   */
  euiInfo: EuiInfo;
  /** Represents the content of _debugSource property on a React Fiber node.
   * @see {@link FileData}
   */
  fileData: FileData;
  /** The HTML element to target. */
  target: HTMLElement | SVGElement;
  /** The EUI name of the icon inside this component. */
  iconType?: string;
  /** The name of the top level React component. */
  sourceComponent?: string;
  /** React state setter for the current Flyout overlay reference. */
  setFlyoutOverlayRef: Dispatch<SetStateAction<OverlayRef | undefined>>;
  /** React state setter for whether the inspect mode is active. */
  setIsInspecting: Dispatch<SetStateAction<boolean>>;
}

/**
 * Parameters for the `getElementFromPoint` function.
 */
export interface GetElementFromPointOptions {
  /** Pointer event from clicking on an component. */
  event: PointerEvent;
  /** HTML id for inspect overlay. */
  overlayId: string;
}

/**
 * Parameters for the `getInspectedElementData` function.
 */
export interface GetInspectedElementOptions {
  /** Pointer event from clicking on an component. */
  event: PointerEvent;
  /** Kibana Core Start services. */
  core: CoreStart;
  /** The component path from the React Fiber node. */
  componentPath: string | undefined;
  /** HTML id for inspect overlay. */
  overlayId: string;
  /** The name of the top level React component. */
  sourceComponent?: string;
  /** React state setter for the current Flyout overlay reference. */
  setFlyoutOverlayRef: Dispatch<SetStateAction<OverlayRef | undefined>>;
  /** React state setter for whether the inspect mode is active. */
  setIsInspecting: Dispatch<SetStateAction<boolean>>;
}

/**
 * Represents a link action in the links section of the inspect flyout.
 */
export interface ActionLink {
  /** The URL for the link. */
  href: string;
  /** The internationalization ID for the link label. */
  i18nId: string;
  /** EUI icon type for the link component. */
  icon: string;
  /** Unique id. */
  id: string;
  /** Visible text for the link. */
  label: string;
}

/**
 * Options for the `capturePreviewScreenshot` function.
 */
export interface CapturePreviewScreenshotOptions {
  /** The HTML element to target.  If not provided, the `querySelector` will be used. */
  target?: HTMLElement | SVGElement;
  /** A query selector to find the HTML container to target.  Default is `.kbnAppWrapper`. */
  querySelector?: string;
  /** The scroll distance from the left of the window.  Default is `0`. */
  scrollX?: number;
  /** The scroll distance from the top of the window.  Default is `0`. */
  scrollY?: number;
  /** The aspect ratio of the resulting image.  Default is `0.75`. */
  aspectRatio?: number;
  /** The maximum width of the resulting image.  Default is `400`. */
  maxWidth?: number;
  /** The maximum height of the resulting image.  Overriden if aspect ratio is provided. */
  maxHeight?: number;
}

/**
 * Parameters for the `getPreviewDimensions` function.
 */
export interface GetPreviewDimensionsParams {
  /** The `canvas` element to target. */
  capture: HTMLCanvasElement;
  /** The maximum `width` for the preview image. Defaults to `400`. */
  maxWidth?: number;
  /** The maximum `height` for the preview image. Defaults to `Infinity`. */
  maxHeight?: number;
  /** The desired aspect ratio for the preview image. Defaults to `0.75`. */
  aspectRatio?: number;
}

/**
 * Result type for the `getPreviewDimensions` function.
 */
export interface GetPreviewDimensionsResult {
  /** The calculated `width` for the preview image. */
  width: number;
  /** The calculated `height` for the preview image. */
  height: number;
  /** Parameters for the `drawImage` function. */
  drawImageParams: Readonly<[number, number, number, number, number, number, number, number]>;
}
