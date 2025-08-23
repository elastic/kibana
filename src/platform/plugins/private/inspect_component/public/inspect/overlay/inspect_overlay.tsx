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
import { EuiPortal, EuiWindowEvent, transparentize, useEuiTheme } from '@elastic/eui';
import { INSPECT_OVERLAY_ID } from '../../constants';
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

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const target = getElementFromPoint({ event });

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
    [componentPath]
  );

  const handleClickAtPositionOfInspectedElement = useCallback(
    async (event: MouseEvent) => {
      await getInspectedElementData({
        event,
        core,
        componentPath,
        sourceComponent,
        setFlyoutOverlayRef,
        setIsInspecting,
      });
    },
    [core, componentPath, sourceComponent, setFlyoutOverlayRef, setIsInspecting]
  );

  /**
   * Capture all click events on the document and stop them from propagating.
   * EuiWindowEvent can't be used here as it doesn't allow for setting 'capture: true'.
   */
  useEffect(() => {
    const stopEventsOnInspectedElement = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (e.type === 'click') {
        handleClickAtPositionOfInspectedElement(e);
      }
    };

    /**
     * pointer-events: none on overlay has a drawback of rendering the appropriate cursor for each component.
     * This is a workaround which forces the crosshair cursor when inspecting.
     */
    const forceCrossHairCursor = document.createElement('style');
    forceCrossHairCursor.textContent = `
      body * {
        cursor: crosshair !important;
      }
      `;
    document.head.appendChild(forceCrossHairCursor);

    document.addEventListener('pointerdown', stopEventsOnInspectedElement, true);
    document.addEventListener('click', stopEventsOnInspectedElement, true);

    return () => {
      document.head.removeChild(forceCrossHairCursor);
      document.removeEventListener('pointerdown', stopEventsOnInspectedElement, true);
      document.removeEventListener('click', stopEventsOnInspectedElement, true);
    };
  }, [handleClickAtPositionOfInspectedElement]);

  const overlayContent = useMemo(
    () => (
      <div className={overlayCss} id={INSPECT_OVERLAY_ID} data-test-subj="inspectOverlayContainer">
        <EuiWindowEvent event="pointermove" handler={handlePointerMove} />
        <InspectHighlight currentPosition={highlightPosition} path={componentPath} />
      </div>
    ),
    [overlayCss, highlightPosition, componentPath, handlePointerMove]
  );

  return <EuiPortal>{overlayContent}</EuiPortal>;
};
