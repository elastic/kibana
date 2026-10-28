/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const canvasToObjectUrl = (canvas: HTMLCanvasElement): Promise<string | undefined> =>
  new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : undefined), 'image/png');
  });

/**
 * Captures the panel as it is currently rendered, cropping its semantic caption from the image.
 */
export const capturePanelThumbnail = async (
  panelId: string,
  fallbackBackground: string
): Promise<string | undefined> => {
  const gridItem = document.getElementById(`panel-${panelId}`);
  const panel = gridItem?.querySelector<HTMLElement>('[role="figure"]');
  if (!panel) return;

  const panelBounds = panel.getBoundingClientRect();
  if (panelBounds.width <= 0 || panelBounds.height <= 0) return;

  const { default: domtoimage } = await import('dom-to-image-more');
  const background = getComputedStyle(panel).backgroundColor;
  const captured = await domtoimage.toCanvas(panel, {
    width: Math.ceil(panelBounds.width),
    height: Math.ceil(panelBounds.height),
    bgcolor: background === 'rgba(0, 0, 0, 0)' ? fallbackBackground : background,
  });

  const caption = panel.querySelector<HTMLElement>('figcaption');
  const captionHeight = caption?.getBoundingClientRect().height ?? 0;
  const cropTop = Math.round(captionHeight * (captured.height / panelBounds.height));
  if (cropTop <= 0) return canvasToObjectUrl(captured);

  const thumbnail = document.createElement('canvas');
  thumbnail.width = captured.width;
  thumbnail.height = Math.max(1, captured.height - cropTop);
  thumbnail
    .getContext('2d')
    ?.drawImage(
      captured,
      0,
      cropTop,
      captured.width,
      thumbnail.height,
      0,
      0,
      thumbnail.width,
      thumbnail.height
    );
  return canvasToObjectUrl(thumbnail);
};
