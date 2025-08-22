/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiThemeComputed } from '@elastic/eui';
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
  euiTheme: EuiThemeComputed;
  iconType?: string;
  setFlyoutRef: Dispatch<SetStateAction<OverlayRef | undefined>>;
  setIsInspecting: Dispatch<SetStateAction<boolean>>;
  sourceComponent?: string;
}

export interface GetInspectedElementOptions {
  event: PointerEvent;
  core: CoreStart;
  componentPath: string | undefined;
  overlayId: string;
  euiTheme: EuiThemeComputed;
  setFlyoutRef: Dispatch<SetStateAction<OverlayRef | undefined>>;
  setIsInspecting: Dispatch<SetStateAction<boolean>>;
  sourceComponent?: string;
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

export interface SetElementHighlightOptions {
  target: HTMLElement | SVGElement;
  euiTheme: EuiThemeComputed;
}

export type StorePreviewScreenshotFn = ({
  id,
  dataUrl,
}: {
  id: string;
  dataUrl: string;
}) => boolean;

export interface ScreenshotCommonOptions {
  /** The HTML element to target.  If not provided, the `querySelector` will be used. */
  target?: HTMLElement | SVGElement;
  /** A query selector to find the HTML container to target.  Default is `.kbnAppWrapper`. */
  querySelector?: string;
  /** A function to store the screenshot.  Default stores to session storage. */
  storeScreenshot?: StorePreviewScreenshotFn;
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
 * Options for the `usePreviewScreenshot` hook.
 */
export interface UsePreviewScreenshotOptions extends ScreenshotCommonOptions {
  /**
   * The ID of the Saved Object.  This can actually be any known identifier.  It can
   * be `undefined`, since it may not be immediately available.
   */
  savedObjectId?: string;
}

/**
 * Options for the `capturePreviewScreenshot` function.
 */
export type CapturePreviewScreenshotOptions = Omit<
  ScreenshotCommonOptions,
  'id' | 'storeScreenshot'
>;
