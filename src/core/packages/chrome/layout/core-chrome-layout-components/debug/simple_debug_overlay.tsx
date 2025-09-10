/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useRef, useLayoutEffect, useState } from 'react';

interface SimpleDebugOverlayProps {
  label?: string;
  background?: string;
  color?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/**
 * A minimal debug component for temporary overlays (sidebar, footer, banner, etc.)
 * Fills its parent container, with customizable background and text.
 *
 * @param props - {@link SimpleDebugOverlayProps}
 * @returns The rendered debug overlay.
 */

export const SimpleDebugOverlay: React.FC<SimpleDebugOverlayProps> = ({
  label = 'Debug Overlay',
  background = '#e6f4ff',
  color = '#0099ff',
  style = {},
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVertical, setIsVertical] = useState(false);

  useLayoutEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setIsVertical(width > 0 && width < 200);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background,
        color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        fontSize: 16,
        border: '2px dashed #0099ff',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <span
        style={
          isVertical
            ? {
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                whiteSpace: 'nowrap',
              }
            : {}
        }
      >
        {children || label}
      </span>
    </div>
  );
};
