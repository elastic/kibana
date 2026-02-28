/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useCallback } from 'react';

const TOUR_STORAGE_KEY = 'cps:projectPicker:tourShown';

const hasSeenTour = (): boolean => {
  try {
    return localStorage.getItem(TOUR_STORAGE_KEY) !== null;
  } catch {
    return true;
  }
};

export const useProjectPickerTour = () => {
  const [isTourOpen, setIsTourOpen] = useState(() => !hasSeenTour());

  const closeTour = useCallback(() => {
    setIsTourOpen(false);
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    } catch {
      // localStorage may be unavailable in restricted environments
    }
  }, []);

  return { isTourOpen, closeTour };
};
