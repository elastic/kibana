/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';
import type { monaco } from '@kbn/monaco';

// Monaco's `HoverPosition.BELOW`, which is not part of its public API.
const HOVER_POSITION_BELOW = 2;

const FIND_WIDGET_SELECTOR = '.find-widget';

// The hover service is shared by every editor on the page, so it only needs to be wrapped once.
const wrappedHoverServices = new WeakSet<object>();

const isInsideFindWidget = (target: HTMLElement | { targetElements: readonly HTMLElement[] }) => {
  // Not `instanceof HTMLElement`, which is false for elements of another document (e.g. an iframe).
  const elements = 'targetElements' in target ? target.targetElements : [target];
  return elements.some((element) => element.closest(FIND_WIDGET_SELECTOR) !== null);
};

/**
 * Opens the tooltips of the find widget below their control, so they are not clipped by the editor.
 */
export const useFindWidgetTooltipPosition = (): ((
  editor: monaco.editor.IStandaloneCodeEditor
) => void) =>
  useCallback((editor: monaco.editor.IStandaloneCodeEditor): void => {
    const hoverService = editor.getContribution('editor.contrib.findController')?._hoverService;

    if (!hoverService?._createHover || wrappedHoverServices.has(hoverService)) {
      return;
    }

    const createHover = hoverService._createHover;

    hoverService._createHover = (options, skipLastFocusedUpdate) => {
      if (options.position?.hoverPosition === undefined && isInsideFindWidget(options.target)) {
        options.position = { ...options.position, hoverPosition: HOVER_POSITION_BELOW };
      }

      return createHover.call(hoverService, options, skipLastFocusedUpdate);
    };

    wrappedHoverServices.add(hoverService);
  }, []);
