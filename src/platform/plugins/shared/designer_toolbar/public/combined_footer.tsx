/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useRef, useEffect, type ReactNode } from 'react';
import type { HttpStart } from '@kbn/core/public';
import { useLayoutUpdate } from '@kbn/core-chrome-layout-components';
import { DesignerToolbarRenderer } from './toolbar';

interface CombinedFooterProps {
  existingFooter: ReactNode;
  http: HttpStart;
}

export const CombinedFooter: React.FC<CombinedFooterProps> = ({ existingFooter, http }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const updateLayout = useLayoutUpdate();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      updateLayout({ footerHeight: Math.round(entry.contentRect.height) });
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, [updateLayout]);

  return (
    <div ref={containerRef}>
      <DesignerToolbarRenderer http={http} />
      {existingFooter}
    </div>
  );
};
