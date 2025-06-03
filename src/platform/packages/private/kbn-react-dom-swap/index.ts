/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ReactDOM, { Renderer } from 'react-dom';
import { createRoot, Root } from 'react-dom/client';

/**
 * This module is a development-only version of ReactDOM that can be used to render
 * easily swap between legacy and modern React rendering methods.
 */
const USE_CONCURRENT_ROOT_KEY: string = `_reactDomSwapUseConcurrentRoot`;
// @ts-ignore
let isConcurrentRoot = window[USE_CONCURRENT_ROOT_KEY] === true;

export const enableConcurrentReact = () => {
  isConcurrentRoot = true;
  // @ts-ignore
  window[USE_CONCURRENT_ROOT_KEY] = true;
};

// @ts-ignore
if (!window._elements) {
  // @ts-ignore
  window._elements = new WeakMap();
}

// @ts-ignore
const elements: WeakMap<Container, Root> = window._elements;

const render: Renderer = (element: any, container: any, cb: any) => {
  if (isConcurrentRoot) {
    const root = elements.get(container) ?? createRoot(container);
    elements.set(container, root);
    root.render(element);
    if (cb) {
      requestIdleCallback(() => {
        cb();
      });
    }

    return element;
  } else {
    return ReactDOM.render(element, container, cb);
  }
};

const unmountComponentAtNode = (container: Element): void => {
  if (isConcurrentRoot) {
    const root = elements.get(container);
    if (root) {
      root.unmount();
      elements.delete(container);
    } else {
      throw new Error('Cannot unmount component that is not mounted.');
    }
  } else {
    ReactDOM.unmountComponentAtNode(container);
  }
};

const SwapReactDOM = { render, unmountComponentAtNode };

export { render, unmountComponentAtNode };

// eslint-disable-next-line import/no-default-export
export default SwapReactDOM;
