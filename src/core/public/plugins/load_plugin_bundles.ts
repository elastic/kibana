/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInfo } from './types';

export const loadPluginBundles = async (plugins: PluginInfo[]) => {
  return new Promise<void>((resolve, reject) => {
    const bundlePaths = plugins.map((plugin) => plugin.bundlePath);
    load(bundlePaths, resolve, reject);
  });
};

function load(urls: string[], onSuccess: () => void, onError: () => void) {
  const scriptsTarget = document.querySelector('head meta[name="add-scripts-here"]')!;

  let pending = urls.length;
  urls.forEach(function (url) {
    const innerCb = () => {
      pending = pending - 1;
      if (pending === 0) {
        onSuccess();
      }
    };

    loadScript(url, scriptsTarget, innerCb, () => undefined);
  });
}

const loadScript = (url: string, element: Element, onLoad: () => void, onFailure: () => void) => {
  const dom = document.createElement('script');
  dom.async = false;
  dom.src = url;
  dom.addEventListener('error', onFailure);
  dom.addEventListener('load', onLoad);
  document.head.insertBefore(dom, element);
};
