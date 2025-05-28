/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MountPoint } from '@kbn/core-mount-utils-browser';
import React from 'react';

/**
 * DEMO PURPOSE ONLY
 * Converts a MountPoint into a React component that can be used in a React tree.
 * This is useful for integrating non-React code into a React application.
 * @param mount
 */
export const fromMountPoint = (mount: MountPoint): React.ReactNode => {
  const Wrapper: React.FC = () => {
    const elementRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
      if (elementRef.current) {
        return mount(elementRef.current);
      }
      return () => {};
    }, []);

    return <div ref={elementRef} />;
  };

  return <Wrapper />;
};
