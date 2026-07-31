/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const VEGA_SANDBOX_BUNDLE_PUBLIC_PATH = '/bundles/kbn-vega-sandbox/';

export const VEGA_SANDBOX_BUNDLE_FILE = 'vega_sandbox.bootstrap.js';

export const VEGA_SANDBOX_RENDER_FUNCTIONS = [
  'kibanaAddFilter',
  'kibanaRemoveFilter',
  'kibanaRemoveAllFilters',
  'kibanaSetTimeFilter',
] as const;

export type VegaSandboxRenderFunction = (typeof VEGA_SANDBOX_RENDER_FUNCTIONS)[number];

export enum VegaSandboxErrorCode {
  RenderFailed = 'render_failed',
  UnsupportedProtocolVersion = 'unsupported_protocol_version',
}

export enum VegaSandboxWarningCode {
  RuntimeWarning = 'runtime_warning',
}
