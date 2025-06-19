/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ReactElement } from 'react';
import ReactDOM from 'react-dom';
import { createRoot, Root, Container } from 'react-dom/client';

declare global {
  interface Window {
    _reactDomSwapEnableConcurrentRoot?: boolean;
    _reactDomSwapElements?: WeakMap<Container, Root>;
  }
}

/**
 * This module is a development-only version of ReactDOM that can be used to render
 * easily swap between legacy and modern React rendering methods.
 */
export const enableConcurrentReact = () => {
  window._reactDomSwapEnableConcurrentRoot = true;
};

if (!window._reactDomSwapElements) {
  window._reactDomSwapElements = new WeakMap();
}

const elements = window._reactDomSwapElements;
const isConcurrentRoot = window._reactDomSwapEnableConcurrentRoot === true;

const render = (element: ReactElement, container: Container) => {
  if (isConcurrentRoot) {
    const root = elements.get(container) ?? createRoot(container);
    elements.set(container, root);
    root.render(element);

    return element;
  } else {
    return ReactDOM.render(element, container);
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
