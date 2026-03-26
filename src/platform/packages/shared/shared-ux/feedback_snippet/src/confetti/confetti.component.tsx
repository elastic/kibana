/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import confetti from 'canvas-confetti';
import React, { useEffect, useRef } from 'react';

export const ConfettiComponent = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let canvasConfetti: confetti.CreateTypes | null = null;
    if (canvasRef.current) {
      canvasConfetti = confetti.create(canvasRef.current, {
        resize: true,
        useWorker: true,
      });
      canvasConfetti({
        origin: { y: 0 },
        startVelocity: 20,
        spread: 90,
        gravity: 1.3,
        ticks: 250,
        disableForReducedMotion: true,
      });
    }
    return () => {
      canvasConfetti?.reset();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      css={css`
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
      `}
    />
  );
};
