/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useSpan } from '.';
import { getUnifiedDocViewerServices } from '../../../../../../../plugin';
import { of, throwError } from 'rxjs';

jest.mock('../../../../../../../plugin', () => ({
  getUnifiedDocViewerServices: jest.fn(),
}));

const mockSearch = jest.fn();
const mockAddDanger = jest.fn();

const mockServices = {
  data: {
    search: {
      search: mockSearch,
    },
  },
  core: {
    notifications: {
      toasts: {
        addDanger: mockAddDanger,
      },
    },
  },
};

describe('useSpan', () => {
  const spanId = 'test-span-id';
  const indexPattern = 'test-index';

  beforeEach(() => {
    jest.clearAllMocks();
    (getUnifiedDocViewerServices as jest.Mock).mockReturnValue(mockServices);
  });

  describe('when parameters are NOT missing', () => {
    it('should fetch span data successfully', async () => {
      const mockHit = { fields: { name: 'test-span' }, _id: 'test-id' };

      mockSearch.mockReturnValue(
        of({
          rawResponse: {
            hits: {
              hits: [mockHit],
            },
          },
        })
      );

      const { result } = renderHook(() => useSpan({ spanId, indexPattern }));
      await waitFor(() => !result.current.loading);

      expect(result.current.loading).toBe(false);
      expect(result.current.span).toEqual(mockHit.fields);
      expect(result.current.docId).toEqual(mockHit._id);
    });
  });

  describe('when parameters are missing', () => {
    it('should set span to null and loading to false', () => {
      const { result } = renderHook(() => useSpan({ spanId: undefined, indexPattern }));

      expect(result.current.loading).toBe(false);
      expect(result.current.span).toBe(null);
      expect(result.current.docId).toBe(null);
    });
  });

  describe('when there is an error', () => {
    it('should show an error toast and set span to null', async () => {
      const error = new Error('something went wrong');
      mockSearch.mockReturnValue(throwError(() => error));

      const { result } = renderHook(() => useSpan({ spanId, indexPattern }));
      await waitFor(() => !result.current.loading);

      expect(result.current.loading).toBe(false);
      expect(result.current.span).toBe(null);
      expect(result.current.docId).toBe(null);
      expect(mockAddDanger).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'something went wrong',
        })
      );
    });
  });
});
