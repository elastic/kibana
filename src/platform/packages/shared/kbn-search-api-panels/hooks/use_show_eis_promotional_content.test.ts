/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { useShowEisPromotionalContent } from './use_show_eis_promotional_content';

describe('useShowEisPromotionalContent', () => {
  const promoId = 'myPromo';
  const localStorageKey = `${promoId}Closed`;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should not show the promo if it was skipped previously', () => {
    localStorage.setItem(localStorageKey, 'true');

    const { result } = renderHook(() => useShowEisPromotionalContent({ promoId }));

    expect(result.current.isPromoVisible).toBe(false);
  });

  it('should hide the promo and set localStorage when OnDismissPromo is called', () => {
    const { result } = renderHook(() => useShowEisPromotionalContent({ promoId }));

    expect(result.current.isPromoVisible).toBe(true);

    act(() => {
      result.current.onDismissPromo();
    });

    expect(localStorage.getItem(localStorageKey)).toBe('true');
    expect(result.current.isPromoVisible).toBe(false);
  });

  it('should not reopen promo after skipping, even if cloud is enabled', () => {
    localStorage.setItem(localStorageKey, 'true');

    const { result, rerender } = renderHook(
      (props: { promoId: string }) => useShowEisPromotionalContent(props),
      {
        initialProps: { promoId },
      }
    );

    expect(result.current.isPromoVisible).toBe(false);

    rerender({ promoId });

    expect(result.current.isPromoVisible).toBe(false);
  });
});
