/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { openWindow } from './src/open_window';
import { Overlay } from './src/overlay';
import { FeatureName, FEATURE_CONFIGS } from './src/features';

export const openFeature = ({ sdkUrl, feature }: { sdkUrl: string; feature: FeatureName }) => {
  const {
    path,
    window: { name, height, width },
  } = FEATURE_CONFIGS[feature];

  const listener = (event: MessageEvent) => {
    if (!sdkUrl.startsWith(event.origin)) return;

    if (event.data?.type === 'window_closed') {
      close();
    }

    if (event.data?.type === 'project_opened') {
      const projectUrl = event.data?.payload?.projectUrl;
      close();
      window.location.href = projectUrl;
    }
  };

  let node = document.getElementById('sdkOverlay') as HTMLElement;
  if (!node) {
    node = document.createElement('div');
    node.id = 'sdkOverlay';
    document.body.appendChild(node);
  }

  const targetWindow = openWindow(`${sdkUrl}${path}`, {
    height,
    width,
    name,
  });
  window.addEventListener('message', listener, false);

  const close = () => {
    if (node) {
      ReactDOM.unmountComponentAtNode(node);
      node.remove();
    }

    targetWindow?.close();
    window.removeEventListener('message', listener, false);
  };

  ReactDOM.render(<Overlay onClose={close} />, node);

  return {
    close,
  };
};
