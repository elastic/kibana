/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import React from 'react';
import ReactDOM from 'react-dom';
import { EuiThemeProvider } from '@elastic/eui';
import { cloneClean, setImportant } from './clone_element';
import { DEVTOOL_MANAGED_ATTR, DEVTOOL_LIVE_ATTR } from '../constants';
import { getPageColorMode } from './get_page_color_mode';

/**
 * Render a ReactElement into the DOM, run `cloneClean` to produce a fully
 * styled fixed-position clone (with computed styles inlined, pseudo-elements
 * replicated, etc.), then tear down the temporary React tree.
 *
 * The returned clone behaves identically to clones created by dragging an
 * existing page element — it is a plain DOM node, not managed by React.
 */
export const renderAndCloneEuiComponent = async (
  element: ReactElement,
  zIndex: number
): Promise<{ clone: HTMLElement; rect: DOMRect }> => {
  // Render into a visible container so computed styles and bounding rects
  // are available for cloneClean. The page already has an EuiProvider so
  // Emotion styles apply automatically — no need to wrap in another one.
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '0px';
  container.style.top = '0px';
  container.style.opacity = '0';
  container.style.pointerEvents = 'none';
  document.body.appendChild(container);

  ReactDOM.render(element, container);

  // The component's root element is the first (and only) child of container.
  const rendered = container.firstElementChild as HTMLElement;
  if (!rendered) {
    ReactDOM.unmountComponentAtNode(container);
    container.remove();
    throw new Error('EUI component did not render a DOM element');
  }

  // Use the same cloneClean path that drag/duplicate use — this copies
  // all computed styles, pseudo-elements, canvas content, etc.
  const result = cloneClean(rendered, zIndex);

  // Tear down the temporary React tree.
  ReactDOM.unmountComponentAtNode(container);
  container.remove();

  return result;
};

/**
 * Render a ReactElement into a fixed-position container and keep the React
 * tree alive so that event handlers (e.g. switch toggle) continue to work.
 *
 * The returned wrapper is a plain HTMLElement that the edit overlay can
 * manage just like a cloneClean result, but the component inside stays
 * interactive.
 */
export const renderEuiComponentLive = (
  element: ReactElement,
  zIndex: number
): {
  wrapper: HTMLElement;
  rect: DOMRect;
  liveReactElement: { element: ReactElement; zIndex: number };
} => {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '0px';
  wrapper.style.top = '0px';
  wrapper.style.zIndex = String(zIndex);
  wrapper.style.pointerEvents = 'auto';
  wrapper.style.width = 'fit-content';
  wrapper.setAttribute(DEVTOOL_MANAGED_ATTR, '');
  wrapper.setAttribute(DEVTOOL_LIVE_ATTR, '');
  document.body.appendChild(wrapper);

  ReactDOM.render(
    React.createElement(EuiThemeProvider, { colorMode: getPageColorMode(), children: element }),
    wrapper
  );

  const rendered = wrapper.firstElementChild as HTMLElement;
  if (!rendered) {
    ReactDOM.unmountComponentAtNode(wrapper);
    wrapper.remove();
    throw new Error('EUI component did not render a DOM element');
  }

  const rect = rendered.getBoundingClientRect();
  return { wrapper, rect, liveReactElement: { element, zIndex } };
};

/**
 * Position a clone at the center of the viewport.
 */
export const centerInViewport = (clone: HTMLElement, rect: DOMRect): void => {
  const centerX = Math.round((window.innerWidth - rect.width) / 2);
  const centerY = Math.round((window.innerHeight - rect.height) / 2);
  setImportant(clone, 'left', `${centerX}px`);
  setImportant(clone, 'top', `${centerY}px`);
};
