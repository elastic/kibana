/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  VegaSandboxErrorCode,
  VegaSandboxRenderFunction,
  VegaSandboxWarningCode,
} from './common';
import type { VegaSandboxRenderDescriptor, VegaSandboxRenderIntent } from './types';

export const VEGA_SANDBOX_PROTOCOL_VERSION = 1;

export interface VegaSandboxDimensions {
  height?: number;
  width?: number;
}

export interface VegaSandboxErrorPayload {
  code: VegaSandboxErrorCode;
  values?: Record<string, unknown>;
}

export interface VegaSandboxWarningPayload {
  code: VegaSandboxWarningCode;
  values?: Record<string, unknown>;
}

export interface VegaSandboxInitMessage {
  /** Parent UI color mode (optional). */
  colorMode?: 'DARK' | 'LIGHT';
  protocolVersion: number;
  type: 'init';
}

export interface VegaSandboxRenderMessage {
  descriptor: VegaSandboxRenderDescriptor;
  dimensions?: VegaSandboxDimensions;
  type: 'render';
}

export interface VegaSandboxResizeMessage {
  dimensions: VegaSandboxDimensions;
  type: 'resize';
}

export interface VegaSandboxRestoreStateMessage {
  state: unknown;
  type: 'restoreState';
}

export type VegaSandboxInboundMessage =
  | VegaSandboxInitMessage
  | VegaSandboxRenderMessage
  | VegaSandboxResizeMessage
  | VegaSandboxRestoreStateMessage;

export interface VegaSandboxRenderedMessage {
  type: 'rendered';
}

export interface VegaSandboxErrorMessage {
  error: VegaSandboxErrorPayload;
  type: 'error';
}

export interface VegaSandboxWarnMessage {
  type: 'warn';
  warning: VegaSandboxWarningPayload;
}

export interface VegaSandboxApplyFilterMessage {
  intent: VegaSandboxRenderIntent & { fn: VegaSandboxRenderFunction };
  type: 'applyFilter';
}

export interface VegaSandboxSaveStateMessage {
  state: unknown;
  type: 'saveState';
}

export interface VegaSandboxOpenHrefMessage {
  href: string;
  type: 'openHref';
}

export type VegaSandboxOutboundMessage =
  | VegaSandboxRenderedMessage
  | VegaSandboxErrorMessage
  | VegaSandboxWarnMessage
  | VegaSandboxApplyFilterMessage
  | VegaSandboxSaveStateMessage
  | VegaSandboxOpenHrefMessage;

export type VegaSandboxMessage = VegaSandboxInboundMessage | VegaSandboxOutboundMessage;
