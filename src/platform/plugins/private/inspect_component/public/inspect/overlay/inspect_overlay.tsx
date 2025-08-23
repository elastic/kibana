/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import { css } from '@emotion/css';
import type { CoreStart, OverlayRef } from '@kbn/core/public';
import {
  EuiPortal,
  EuiWindowEvent,
  transparentize,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { findReactComponentPath, getElementFromPoint, getInspectedElementData } from '../../utils';
import { InspectHighlight } from './inspect_highlight';

interface Props {
  core: CoreStart;
  setFlyoutOverlayRef: Dispatch<SetStateAction<OverlayRef | undefined>>;
  setIsInspecting: Dispatch<SetStateAction<boolean>>;
}

export const InspectOverlay = ({ core, setFlyoutOverlayRef, setIsInspecting }: Props) => {
  const { euiTheme } = useEuiTheme();
  const [highlightPosition, setHighlightPosition] = useState<CSSProperties>({});
  const [componentPath, setComponentPath] = useState<string | undefined>();
  const [sourceComponent, setSourceComponent] = useState<string | undefined>();

  const overlayId = useGeneratedHtmlId({
    prefix: 'inspectOverlay',
  });

  /**
   * This functions prevents the inspected element from triggering onClick events
   * and also prevents it from losing focus which would prevent onHover events
   * from being triggered on the inspected element, which wouldnt allow for inspecting elements which only
   * show up on hover.
   * EuiWindowEvent does not work here because it does not support the 'capture' option
   * and we need to capture the event before it reaches the inspected element.
   */
  const preventInspectedElementOnClickFromTriggering = (e: MouseEvent) => {
    e.stopImmediatePropagation();
    e.preventDefault();
  };

  /** pointer-events: none is required for triggering onHover events.
   * See: {@link preventInspectedElementOnClickFromTriggering}
   */
  const overlayCss = useMemo(
    () => css`
      background-color: ${transparentize(euiTheme.colors.backgroundFilledText, 0.2)};
      inset: 0;
      position: fixed;
      z-index: ${Number(euiTheme.levels.modal) + 1};
      pointer-events: none;
    `,
    [euiTheme.colors.backgroundFilledText, euiTheme.levels.modal]
  );

  useEffect(() => {
    window.addEventListener('click', preventInspectedElementOnClickFromTriggering, true);
    return () => {
      window.removeEventListener('click', preventInspectedElementOnClickFromTriggering, true);
    };
  }, []);

  useEffect(() => {
    /** pointer-events: none on overlay has a drawback of rendering the appropriate cursor for each component.
     * This is a workaround which forces the crosshair cursor when inspecting.
     * {@link overlayCss}
     * {@link preventInspectedElementOnClickFromTriggering}
     */
    const forceCrossHairCursor = document.createElement('style');
    forceCrossHairCursor.textContent = `
    body * {
      cursor: crosshair !important;
    }
  `;
    document.head.appendChild(forceCrossHairCursor);
    return () => {
      document.head.removeChild(forceCrossHairCursor);
    };
  }, []);

  const handleClickAtPositionOfInspectedElement = useCallback(
    async (event: PointerEvent) => {
      await getInspectedElementData({
        event,
        core,
        componentPath,
        overlayId,
        sourceComponent,
        setFlyoutOverlayRef,
        setIsInspecting,
      });
    },
    [core, componentPath, overlayId, sourceComponent, setFlyoutOverlayRef, setIsInspecting]
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const target = getElementFromPoint({ event, overlayId });

      if (!target) {
        return;
      }

      const { top, left, width, height } = target.getBoundingClientRect();

      const pathInfo = findReactComponentPath(target as HTMLElement);

      setSourceComponent(pathInfo?.sourceComponent);

      if (pathInfo?.path && pathInfo.path !== componentPath) {
        setComponentPath(pathInfo.path);
      }

      setHighlightPosition({
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(${left}px, ${top}px)`,
      });
    },
    [overlayId, componentPath]
  );

  const overlayContent = useMemo(
    () => (
      <div className={overlayCss} id={overlayId} data-test-subj="inspectOverlayContainer">
        <EuiWindowEvent event="pointermove" handler={handlePointerMove} />
        <EuiWindowEvent event="pointerdown" handler={handleClickAtPositionOfInspectedElement} />
        <InspectHighlight currentPosition={highlightPosition} path={componentPath} />
      </div>
    ),
    [
      overlayCss,
      overlayId,
      highlightPosition,
      componentPath,
      handlePointerMove,
      handleClickAtPositionOfInspectedElement,
    ]
  );

  return <EuiPortal>{overlayContent}</EuiPortal>;
};
