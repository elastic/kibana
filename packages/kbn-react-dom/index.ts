/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createPortal, type Renderer, Container } from 'react-dom';
// eslint-disable-next-line @kbn/eslint/module_migration
import { createRoot, Root } from 'react-dom/client';

const elements = new WeakMap<Container, Root>();

const render: Renderer = (element: any, container: any, cb: any) => {
  const root = createRoot(container);
  elements.set(container, root);
  root.render(element);
  return element;
};

const unmountComponentAtNode = (container: Container) => {
  const root = elements.get(container);
  if (root) {
    root.unmount();
    return true;
  }
  return false;
};

const ReactDOM = { render, unmountComponentAtNode, createPortal };

export { render, createPortal, unmountComponentAtNode };

// eslint-disable-next-line import/no-default-export
export default ReactDOM;
