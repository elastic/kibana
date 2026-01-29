/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useState } from 'react';

interface UseShowEisPromotionalContentProps {
  promoId: string;
}

export const useShowEisPromotionalContent = ({ promoId }: UseShowEisPromotionalContentProps) => {
  const localStorageKey = `${promoId}Closed`;
  const [isPromoVisible, setIsPromoVisible] = useState<boolean>(false);
  const onDismissPromo = useCallback(() => {
    localStorage.setItem(localStorageKey, 'true');
    setIsPromoVisible(false);
  }, [localStorageKey]);

  useEffect(() => {
    const isTourDismiss = localStorage.getItem(localStorageKey) === 'true';

    if (!isTourDismiss && !isPromoVisible) {
      setIsPromoVisible(true);
    }
  }, [isPromoVisible, localStorageKey]);

  return { isPromoVisible, onDismissPromo };
};
