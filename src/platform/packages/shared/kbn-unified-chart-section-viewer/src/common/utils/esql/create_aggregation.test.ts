/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { replaceFunctionParams } from './create_aggregation';

describe('replaceFunctionParams', () => {
  it('should substitute a ?? placeholder and add backticks where needed', () => {
    const result = replaceFunctionParams('AVG(??metricField)', {
      metricField: 'system.load.1m',
    });
    expect(result).toBe('AVG(system.load.`1m`)');
  });

  it('should substitute a ?? placeholder without adding backticks when not needed', () => {
    const result = replaceFunctionParams('AVG(??metricField)', {
      metricField: 'system.load.normal',
    });
    expect(result).toBe('AVG(system.load.normal)');
  });

  it('should handle a mix of ?? and ? placeholders', () => {
    const result = replaceFunctionParams('AVG(??field) WHERE service.name == ?serviceName', {
      field: 'system.cpu.total.norm.pct',
      serviceName: 'auth-service',
    });
    expect(result).toBe('AVG(system.cpu.total.norm.pct) WHERE service.name == "auth-service"');
  });

  it('should handle nested functions like SUM(RATE(??metricField))', () => {
    const result = replaceFunctionParams('SUM(RATE(??metricField))', {
      metricField: 'system.network.in.bytes',
    });
    expect(result).toBe('SUM(RATE(system.network.`in`.bytes))');
  });
});
