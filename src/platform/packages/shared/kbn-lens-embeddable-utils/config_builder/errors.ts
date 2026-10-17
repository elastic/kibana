/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Codes identifying why a Lens state could not be converted, so consumers can
 * render a translated message instead of the developer-facing error message.
 */
export const LENS_ERROR_CODES = {
  /** Generic fallback for any conversion failure without a more specific code */
  INVALID_CONFIGURATION: 'lens_invalid_configuration',
  /** A layer references a data view that cannot be resolved */
  DATA_VIEW_NOT_FOUND: 'lens_data_view_not_found',
  /** No usable datasource layers were found for the visualization */
  DATASOURCE_NOT_FOUND: 'lens_datasource_not_found',
  /** The datasource type is not supported by the visualization */
  DATASOURCE_UNSUPPORTED: 'lens_datasource_unsupported',
} as const;

export type LensErrorCode = (typeof LENS_ERROR_CODES)[keyof typeof LENS_ERROR_CODES];

export class LensConversionError extends Error {
  constructor(message: string, public readonly code: LensErrorCode) {
    super(message);
    this.name = 'LensConversionError';
  }
}
