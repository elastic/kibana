/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef } from 'react';
import { css } from '@emotion/css';

interface Props {
  element: HTMLElement | SVGElement;
}

export const PreviewImage = ({ element }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scale = 0.5;

  // TODO: Try to handle canvas and image elements
  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = '';

    const clone = element.cloneNode(true) as HTMLElement;

    containerRef.current.appendChild(clone);
  }, [element]);

  const containerCss = css({
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    width: `${100 / scale}%`,
    height: `${100 / scale}%`,
    pointerEvents: 'none',
    userSelect: 'none',
    overflow: 'hidden',
  });

  return <div ref={containerRef} className={containerCss} />;
};
