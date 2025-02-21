/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createPortal, type Renderer, Container } from 'react-dom';
import { createRoot, Root } from 'react-dom/client';

// @ts-ignore
if (!window._elements) {
  // @ts-ignore
  window._elements = new WeakMap();
}
// @ts-ignore
const elements: WeakMap<Container, Root> = window._elements;

const render: Renderer = (element: any, container: any, cb: any) => {
  const root = elements.get(container) ?? createRoot(container);
  elements.set(container, root);
  root.render(element);
  if (cb) {
    requestIdleCallback(() => {
      cb();
    });
  }

  return element;
};

const unmountComponentAtNode = (container: Container): void => {
  const root = elements.get(container);
  if (root) {
    root.unmount();
    elements.delete(container);
  } else {
    throw new Error('Cannot unmount component that is not mounted.');
  }
};

const ReactDOM = { render, unmountComponentAtNode, createPortal };

export { render, createPortal, unmountComponentAtNode };

// eslint-disable-next-line import/no-default-export
export default ReactDOM;
