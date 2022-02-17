/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef, useState } from 'react';

/**
 * A component that shows it children with a 300ms delay. This is good for wrapping
 * loading spinners for tasks that might potentially be very fast (e.g. loading async chunks).
 * That way we don't show a quick flash of the spinner before the actual content and will only
 * show the spinner once loading takes a bit longer (more than 300ms).
 */
export const DeferredSpinner: React.FC = ({ children }) => {
  const timeoutRef = useRef<number>();
  const [showContent, setShowContent] = useState(false);
  useEffect(() => {
    timeoutRef.current = window.setTimeout(() => {
      setShowContent(true);
    }, 300);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return showContent ? <React.Fragment>{children}</React.Fragment> : null;
};
