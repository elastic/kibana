/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatBytes } from '.';

describe('BytesFormatter', () => {
  it('should format bytes correctly', () => {
    const result = formatBytes(1000);
    expect(result).toBe('1000 Bytes');
  });

  it('should format bytes correctly if 0 is sent', () => {
    const result = formatBytes(0);
    expect(result).toBe('0 Bytes');
  });

  it('should format bytes correctly into KB', () => {
    const result = formatBytes(10000);
    expect(result).toBe('10 KB');
  });

  it('should format bytes correctly into MB', () => {
    const result = formatBytes(1048576);
    expect(result).toBe('1 MB');
  });

  it('should format bytes correctly with decimals', () => {
    const result = formatBytes(10000, 3);
    expect(result).toBe('9.766 KB');
  });
});
