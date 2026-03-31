/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import { flushSync } from 'react-dom';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

type Container = Element | DocumentFragment;

const roots = new WeakMap<Container, Root>();

const getRoot = (container: Container) => {
  const existingRoot = roots.get(container);

  if (existingRoot) {
    return existingRoot;
  }

  const root = createRoot(container);
  roots.set(container, root);

  return root;
};

export const render = (node: ReactNode, container: Container, callback?: () => void): Root => {
  const isInitialRender = !roots.has(container);
  const root = getRoot(container);

  if (isInitialRender || callback) {
    flushSync(() => {
      root.render(node);
    });
    callback?.();
  } else {
    root.render(node);
  }

  return root;
};

export const unmountComponentAtNode = (container: Container): boolean => {
  const root = roots.get(container);

  if (!root) {
    return false;
  }

  root.unmount();
  roots.delete(container);

  return true;
};
