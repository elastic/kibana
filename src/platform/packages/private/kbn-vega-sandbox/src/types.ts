/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Spec, View } from 'vega';
import type {
  VegaSandboxErrorCode,
  VegaSandboxRenderFunction,
  VegaSandboxWarningCode,
} from './common';

export interface VegaSandboxTooltipConfig {
  centerOnMark?: boolean | number;
  padding?: number | { left: number; right: number; top: number; bottom: number };
  position?: 'top' | 'right' | 'bottom' | 'left';
  textTruncate?: boolean;
}

export interface VegaSandboxRenderDescriptor {
  spec: Spec;
  vlspec?: Spec;
  renderer: 'canvas' | 'svg';
  useHover: boolean;
  useResize: boolean;
  tooltips: boolean | VegaSandboxTooltipConfig;
}

export interface VegaSandboxRenderIntent {
  args: unknown[];
  fn: VegaSandboxRenderFunction;
}

export interface VegaSandboxRenderCallbacks {
  onError?: (error: { code: VegaSandboxErrorCode; values?: Record<string, unknown> }) => void;
  onFunction?: (intent: VegaSandboxRenderIntent) => void;
  onWarn?: (warning: { code: VegaSandboxWarningCode; values?: Record<string, unknown> }) => void;
}

export interface VegaSandboxRenderParams extends VegaSandboxRenderCallbacks {
  container: HTMLElement;
  controls: HTMLElement;
  descriptor: VegaSandboxRenderDescriptor;
}

export interface VegaSandboxRenderController {
  destroy: () => void;
  resize: (dimensions?: { height?: number; width?: number }) => Promise<void>;
  view: View;
}
