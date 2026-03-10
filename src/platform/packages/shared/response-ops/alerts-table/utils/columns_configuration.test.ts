/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { applyColumnsConfiguration } from './columns_configuration';

describe('applyColumnsConfiguration', () => {
  it('should return original columns if no configuredColumns are provided', () => {
    const defaultColumns = [{ id: 'a' }, { id: 'b' }];
    const result = applyColumnsConfiguration({ defaultColumns });
    expect(result).toEqual(defaultColumns);
  });

  it('should return original columns if configuredColumns is empty', () => {
    const defaultColumns = [{ id: 'a' }, { id: 'b' }];
    const result = applyColumnsConfiguration({ defaultColumns, configuredColumns: [] });
    expect(result).toEqual(defaultColumns);
  });

  it('should merge configuredColumns with original columns', () => {
    const defaultColumns = [
      { id: 'a', initialWidth: 100 },
      { id: 'b', initialWidth: 200 },
    ];
    const configuredColumns = [{ id: 'a', initialWidth: 150 }];
    const result = applyColumnsConfiguration({ defaultColumns, configuredColumns });
    expect(result).toEqual([{ id: 'a', initialWidth: 150 }]);
  });

  it('should add new columns from configuredColumns that are not in original columns', () => {
    const defaultColumns = [{ id: 'a', initialWidth: 100 }];
    const configuredColumns = [
      { id: 'a', initialWidth: 150 },
      { id: 'b', initialWidth: 200 },
    ];
    const result = applyColumnsConfiguration({ defaultColumns, configuredColumns });
    expect(result).toEqual([
      { id: 'a', initialWidth: 150 },
      { id: 'b', initialWidth: 200 },
    ]);
  });

  it('should handle case where configuredColumns has no matching ids in original columns', () => {
    const defaultColumns = [{ id: 'a', initialWidth: 100 }];
    const configuredColumns = [{ id: 'b', initialWidth: 200 }];
    const result = applyColumnsConfiguration({ defaultColumns, configuredColumns });
    expect(result).toEqual([{ id: 'b', initialWidth: 200 }]);
  });
});
