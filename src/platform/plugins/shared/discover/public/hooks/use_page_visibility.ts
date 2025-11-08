/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState, useCallback } from 'react';

interface DocumentWithVisibility extends Document {
  msHidden?: boolean;
  webkitHidden?: boolean;
}

function getVisibilityProps(doc: DocumentWithVisibility) {
  if (typeof doc.msHidden !== 'undefined') {
    return { hidden: 'msHidden' as const, event: 'msvisibilitychange' };
  } else if (typeof doc.webkitHidden !== 'undefined') {
    return { hidden: 'webkitHidden' as const, event: 'webkitvisibilitychange' };
  }
  return { hidden: 'hidden' as const, event: 'visibilitychange' };
}

/**
 * A React hook that returns the visibility state of the page.
 * It listens for visibility changes and updates the state accordingly.
 * Inspired by the logic which already exist in the data plugin for auto_refresh.
 * @returns {boolean} - True if the page is visible, false otherwise.
 */
export function usePageVisibility() {
  const doc = document as DocumentWithVisibility;
  const { hidden, event } = getVisibilityProps(doc);

  const getIsVisible = useCallback(() => !doc[hidden], [doc, hidden]);

  const [isVisible, setIsVisible] = useState(getIsVisible);

  useEffect(() => {
    const handleVisibilityChange = () => setIsVisible(getIsVisible());
    doc.addEventListener(event, handleVisibilityChange);
    return () => {
      doc.removeEventListener(event, handleVisibilityChange);
    };
  }, [doc, event, getIsVisible, hidden]);

  return isVisible;
}
