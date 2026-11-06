/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { EuiProvider } from '@elastic/eui';
import { EuiThemeBorealis } from '@elastic/eui-theme-borealis';
import { flushSync } from 'react-dom';
import { setImportant } from '../../../lib/dom/set_important';
import { DEVTOOL_MANAGED_ATTR, DEVTOOL_LIVE_ATTR } from '../../../lib/constants';
import { getPageColorMode } from '../../../lib/dom/get_page_color_mode';
import { SerializedStateContext } from './serializable_state';

/**
 * Render a ReactElement into a fixed-position container and keep the React
 * tree alive so that event handlers (e.g. switch toggle) continue to work.
 *
 * The returned wrapper is a plain HTMLElement that the edit overlay can
 * manage just like a cloneClean result, but the component inside stays
 * interactive.
 *
 * Call `cleanup()` on the returned object when the element is removed to
 * unmount the React root and prevent memory leaks.
 */
export const renderEuiComponentLive = async (
  element: ReactElement,
  zIndex: number,
  initialState?: Record<string, string>
): Promise<{
  wrapper: HTMLElement;
  rect: DOMRect;
  liveReactElement: { element: ReactElement; zIndex: number };
  cleanup: () => void;
}> => {
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

  const root = createRoot(wrapper);
  try {
    flushSync(() => {
      const stateProvider = initialState
        ? createElement(SerializedStateContext.Provider, {
            value: initialState,
            children: element,
          })
        : element;
      root.render(
        createElement(EuiProvider, {
          theme: EuiThemeBorealis,
          colorMode: getPageColorMode(),
          globalStyles: false,
          children: stateProvider,
        })
      );
    });
  } catch (err) {
    root.unmount();
    wrapper.remove();
    throw err;
  }

  const rendered = wrapper.firstElementChild;

  if (!rendered) {
    root.unmount();
    wrapper.remove();
    throw new Error('EUI component did not render a DOM element');
  }

  const rect = rendered.getBoundingClientRect();
  const cleanup = () => {
    root.unmount();
    wrapper.remove();
  };

  return { wrapper, rect, liveReactElement: { element, zIndex }, cleanup };
};

/**
 * Position a clone at the center of the viewport.
 *
 * @param clone - The cloned element to position.
 * @param rect - The element's bounding rect.
 */
export const centerInViewport = (clone: HTMLElement, rect: DOMRect): void => {
  const centerX = Math.round((window.innerWidth - rect.width) / 2);
  const centerY = Math.round((window.innerHeight - rect.height) / 2);
  setImportant(clone, 'left', `${centerX}px`);
  setImportant(clone, 'top', `${centerY}px`);
};
