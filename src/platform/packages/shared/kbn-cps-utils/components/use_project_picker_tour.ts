/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useEffect } from 'react';

const TOUR_STORAGE_KEY = 'cps:projectPicker:tourShown';

export const useProjectPickerTour = () => {
  const [isTourOpen, setIsTourOpen] = useState(false);

  useEffect(() => {
    const tourShown = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!tourShown) {
      setIsTourOpen(true);
    }
  }, []);

  const closeTour = () => {
    setIsTourOpen(false);
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
  };

  return { isTourOpen, closeTour };
};
