/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { SNAPSHOT_MAX_BYTES, SNAPSHOT_MAX_DIMENSION } from '../constants';
import type { CommentSnapshot } from '../types';

/** Wide enough to read UI text in the full-screen view, small enough to fit the byte budget at a decent quality. */
const OUTPUT_MAX_WIDTH = 1600;
const QUALITY_STEPS = [0.8, 0.65, 0.5, 0.4];
const SCALE_STEPS = [1, 0.75, 0.5];
const TRANSPARENT = /^(transparent|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0(\.0+)?\s*\))$/;

/** First opaque `background-color` from the element up to `<html>`, or white: `body` is often transparent, and transparent pixels turn black in JPEGs. */
export const getEffectiveBackgroundColor = (element: Element): string => {
  for (let current: Element | null = element; current; current = current.parentElement) {
    const color = getComputedStyle(current).backgroundColor;
    if (color && !TRANSPARENT.test(color)) {
      return color;
    }
  }
  return '#ffffff';
};

const flatten = (
  source: HTMLCanvasElement,
  scale: number,
  background: string
): HTMLCanvasElement => {
  const target = document.createElement('canvas');
  target.width = Math.max(1, Math.round(source.width * scale));
  target.height = Math.max(1, Math.round(source.height * scale));
  const context = target.getContext('2d');
  if (!context) {
    return source;
  }
  context.fillStyle = background;
  context.fillRect(0, 0, target.width, target.height);
  context.drawImage(source, 0, 0, target.width, target.height);
  return target;
};

/**
 * Captures the viewport as a JPEG within the byte budget, lowering quality and then
 * resolution as needed. Throws when there is no screenshot to be had, with the reason
 * in words for the person who asked for one: the capture itself can fail (capture
 * libraries throw on cross-origin content) or come out empty, and a page can be too
 * busy to fit the budget.
 */
export const createSnapshot = async (
  captureViewport: () => Promise<HTMLCanvasElement>
): Promise<CommentSnapshot> => {
  const canvas = await captureViewport();
  if (canvas.width === 0 || canvas.height === 0) {
    throw new Error(
      i18n.translate('devComments.snapshot.empty', { defaultMessage: 'nothing was captured' })
    );
  }
  const background = getEffectiveBackgroundColor(document.body);
  // Large or high-density screens produce more pixels than the output needs.
  const baseScale = Math.min(
    1,
    OUTPUT_MAX_WIDTH / canvas.width,
    SNAPSHOT_MAX_DIMENSION / canvas.height
  );
  for (const scaleStep of SCALE_STEPS) {
    const scaled = flatten(canvas, baseScale * scaleStep, background);
    for (const quality of QUALITY_STEPS) {
      const image = scaled.toDataURL('image/jpeg', quality).split(',')[1] ?? '';
      if (image && (image.length * 3) / 4 <= SNAPSHOT_MAX_BYTES) {
        return { mimeType: 'image/jpeg', width: scaled.width, height: scaled.height, image };
      }
    }
  }
  throw new Error(
    i18n.translate('devComments.snapshot.tooLarge', {
      defaultMessage: 'The image is too large to store, even at the lowest quality',
    })
  );
};
