/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useEsqlDocumentCount } from './use_esql_document_count';

// Mock the Kibana services
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      data: {
        search: {
          search: jest.fn(),
        },
      },
    },
  }),
}));

describe('useEsqlDocumentCount', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useEsqlDocumentCount(''));
    
    expect(result.current.count).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.calculationTime).toBeNull();
    expect(result.current.estimatedDuration).toBeNull();
    expect(typeof result.current.triggerCount).toBe('function');
  });

  it('should handle empty query', () => {
    const { result } = renderHook(() => useEsqlDocumentCount(''));
    
    expect(result.current.count).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
