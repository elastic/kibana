/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DataViewNotFoundError,
  DatasourceNotFoundError,
  DatasourceUnsupportedError,
  InvalidConfigurationError,
  LENS_ERROR_CODES,
  isLensErrorCode,
  LENS_ERROR_TYPE,
  LensError,
} from '.';

describe('Lens errors', () => {
  it.each([
    [new DataViewNotFoundError('layer-1'), LENS_ERROR_CODES.DATA_VIEW_NOT_FOUND],
    [new DatasourceNotFoundError(), LENS_ERROR_CODES.DATASOURCE_NOT_FOUND],
    [new DatasourceUnsupportedError(), LENS_ERROR_CODES.DATASOURCE_UNSUPPORTED],
    [new InvalidConfigurationError('bad'), LENS_ERROR_CODES.INVALID_CONFIGURATION],
  ])('%s carries its code and the Lens type', (error, code) => {
    expect(error).toBeInstanceOf(LensError);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe(code);
    expect(error.type).toBe(LENS_ERROR_TYPE);
  });

  it('includes the layer id in the data view error message', () => {
    const error = new DataViewNotFoundError('layer-1');
    expect(error.layerId).toBe('layer-1');
    expect(error.message).toBe('Cannot resolve the data view for layer "layer-1".');
    expect(error.name).toBe('DataViewNotFoundError');
  });

  describe('isLensErrorCode', () => {
    it.each(Object.values(LENS_ERROR_CODES))('accepts "%s"', (code) => {
      expect(isLensErrorCode(code)).toBe(true);
    });

    it.each(['not_a_lens_code', '', 42, null, undefined])('rejects %p', (value) => {
      expect(isLensErrorCode(value)).toBe(false);
    });
  });
});
