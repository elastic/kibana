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
import { useGeneratedHtmlId } from '@elastic/eui';

interface Props {
  element: HTMLElement | SVGElement;
}
/**
 * The PreviewImage component is responsible for rendering a scaled-down preview of a given HTML or SVG element.
 * It clones the provided element and applies a scaling transformation to fit it within its container.
 */
export const PreviewImage = ({ element }: Props) => {
  const generatedId = useGeneratedHtmlId();
  const containerRef = useRef<HTMLDivElement>(null);
  const scale = 0.5;

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = '';

    let clone: HTMLElement;

    if (element instanceof HTMLCanvasElement) {
      const canvasClone = document.createElement('canvas');
      canvasClone.width = element.width;
      canvasClone.height = element.height;
      const ctx = canvasClone.getContext('2d');
      if (ctx) {
        ctx.drawImage(element, 0, 0);
      }
      clone = canvasClone;
    } else if (element instanceof HTMLImageElement) {
      const imgClone = document.createElement('img');
      imgClone.src = element.src;
      imgClone.width = element.width;
      imgClone.height = element.height;
      clone = imgClone;
    } else {
      clone = element.cloneNode(true) as HTMLElement;
    }

    clone.id = generatedId;
    containerRef.current.appendChild(clone);
  }, [element, generatedId]);

  const containerCss = css({
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    width: `${100 / scale}%`,
    height: `${100 / scale}%`,
    pointerEvents: 'none',
    userSelect: 'none',
    overflow: 'hidden',
    '& *': {
      pointerEvents: 'none',
    },
  });

  return <div ref={containerRef} className={containerCss} />;
};
