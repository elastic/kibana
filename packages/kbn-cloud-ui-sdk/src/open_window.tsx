/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface OpenWindowOptions {
  height: number;
  name: '_blank' | '_parent' | '_self' | '_top' | string;
  width: number;
}

const defaultOptions: OpenWindowOptions = {
  height: 600,
  name: '_blank',
  width: 800,
};

interface Features {
  focus: 'yes' | 'no';
  height: number;
  left: number;
  location: 'yes' | 'no';
  menubar: 'yes' | 'no';
  popup: 'yes' | 'no';
  resizable: 'yes' | 'no';
  status: 'yes' | 'no';
  toolbar: 'yes' | 'no';
  top: number;
  width: number;
}

const convertOptions = (options: Features): string =>
  Object.entries(options)
    .map(([key, value]) => `${key}=${value}`)
    .join(',');

export const openWindow = (url: string, options?: Partial<OpenWindowOptions>) => {
  const windowOptions = { ...defaultOptions, ...options };

  const { width, height, name } = windowOptions;
  const center = getCenterPoint(width, height);

  const features = convertOptions({
    focus: 'yes',
    height,
    location: 'no',
    menubar: 'no',
    popup: 'yes',
    resizable: 'no',
    status: 'no',
    toolbar: 'no',
    width,
    ...center,
  });

  return window.open(url, name, features);
};

function getCenterPoint(width: number, height: number) {
  const { screenX, screenY, screenLeft, screenTop, outerWidth, outerHeight } = window;
  const {
    documentElement: { clientWidth, clientHeight },
  } = document;

  const left = (screenX || screenLeft) + ((outerWidth || clientWidth) - width) / 2;
  const top = (screenY || screenTop) + ((outerHeight || clientHeight) - height) / 2;

  return {
    left,
    top,
  };
}
