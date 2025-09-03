/* eslint-disable @kbn/eslint/require-license-header */
/**
 * @notice
 *
 * This code is based on the `canvas-confetti` library under the ISC license.
 *
 * Copyright (c) 2020, Kiril Vatev
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

import { css } from '@emotion/react';
import confetti from 'canvas-confetti';
import React, { useEffect, useRef } from 'react';

export const Confetti = () => {
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
