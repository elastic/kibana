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

export interface GetElementFromPointOptions {
  event: PointerEvent;
  overlayId: string;
}

export interface FileData {
  columnNumber: number;
  lineNumber: number;
  fileName: string;
}

export interface EuiInfo {
  componentName: string;
  docsLink: string;
}

export interface ComponentData extends FileData {
  codeowners: string[];
  euiInfo: EuiInfo;
  iconType?: string;
  relativePath: string;
  baseFileName: string;
  image?: string | null;
  sourceComponent?: string;
}

export interface ReactFiberNode {
  _debugSource?: FileData;
  _debugOwner?: ReactFiberNode | null;
  elementType: string | null;
  type:
    | string
    | {
        name?: string;
        displayName?: string;
      };
}

export interface GetComponentDataOptions {
  core: CoreStart;
  euiInfo: EuiInfo;
  fileData: FileData;
  target: HTMLElement | SVGElement;
  iconType?: string;
  sourceComponent?: string;
  setFlyoutOverlayRef: Dispatch<SetStateAction<OverlayRef | undefined>>;
  setIsInspecting: Dispatch<SetStateAction<boolean>>;
}

export interface GetInspectedElementOptions {
  event: PointerEvent;
  core: CoreStart;
  componentPath: string | undefined;
  overlayId: string;
  sourceComponent?: string;
  setFlyoutOverlayRef: Dispatch<SetStateAction<OverlayRef | undefined>>;
  setIsInspecting: Dispatch<SetStateAction<boolean>>;
}

export interface InspectComponentResponse {
  codeowners: string[];
  relativePath: string;
  baseFileName: string;
}

export interface ActionLink {
  href: string;
  i18nId: string;
  icon: string;
  id: string;
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
