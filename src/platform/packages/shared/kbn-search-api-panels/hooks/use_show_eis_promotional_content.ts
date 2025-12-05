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
  isCloudEnabled: boolean;
}

export const useShowEisPromotionalContent = ({
  promoId,
  isCloudEnabled,
}: UseShowEisPromotionalContentProps) => {
  const localStorageKey = `${promoId}Closed`;
  const [isPromoVisible, setIsPromoVisible] = useState<boolean>(false);
  const onSkipTour = useCallback(() => {
    localStorage.setItem(localStorageKey, 'true');
    setIsPromoVisible(false);
  }, [localStorageKey]);

  useEffect(() => {
    const isTourSkipped = localStorage.getItem(localStorageKey) === 'true';

    if (!isTourSkipped && isCloudEnabled && !isPromoVisible) {
      setIsPromoVisible(true);
    }
  }, [isCloudEnabled, isPromoVisible, localStorageKey]);

  return { isPromoVisible, onSkipTour };
};
