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
import { toMountPoint } from '@kbn/react-kibana-mount';
import { findFirstNonIgnoredComponent } from '../../../lib/fiber/find_first_non_ignored_component';
import type { ReactFiberNodeWithDomElement, SourceComponent } from '../../../lib/fiber/types';
import { findFirstFiberWithDebugSource } from '../../../lib/fiber/find_first_fiber_with_debug_source';
import { handleEventPropagation } from '../../../lib/dom/handle_event_propagation';
import { getInspectedElementData } from '../../../lib/get_inspected_element_data';
import { getElementFromPoint } from '../../../lib/dom/get_element_from_point';
import { findSourceComponent } from '../../../lib/fiber/find_source_component';
import { InspectFlyout, flyoutOptions } from '../flyout/inspect_flyout';
import { INSPECT_OVERLAY_ID } from '../../../lib/constants';
import { InspectHighlight } from './inspect_highlight';

interface Props {
  core: CoreStart;
  setFlyoutOverlayRef: Dispatch<SetStateAction<OverlayRef | undefined>>;
  setIsInspecting: Dispatch<SetStateAction<boolean>>;
}

/**
 * The InspectOverlay component is responsible for rendering an overlay on the entire viewport
 * when the user is in "inspect" mode. It highlights elements as the user hovers over them and
 * captures click events to inspect the clicked element.
 * It uses pointer events to track mouse movements and clicks, and it prevents these events
 * from propagating to underlying elements. With the exception of hovering.
 */
export const InspectOverlay = ({ core, setFlyoutOverlayRef, setIsInspecting }: Props) => {
  const { euiTheme } = useEuiTheme();
  const [highlightPosition, setHighlightPosition] = useState<CSSProperties>({});
  const [componentPath, setComponentPath] = useState<string | null>(null);
  const [sourceComponent, setSourceComponent] = useState<SourceComponent | null>(null);
  const [targetFiberNodeWithDomElement, setTargetFiberNodeWithDomElement] =
    useState<ReactFiberNodeWithDomElement | null>(null);

  /**
   * pointer-events: none is required for {@link stopEventsOnInspectedElement} to work properly.
   */
  const overlayCss = useMemo(
    () => css`
      background-color: ${transparentize(euiTheme.colors.backgroundFilledText, 0.2)};
      inset: 0;
      position: fixed;
      z-index: ${Number(euiTheme.levels.toast) + 1};
      pointer-events: none;
    `,
    [euiTheme.colors.backgroundFilledText, euiTheme.levels.toast]
  );

  const handlePointerMove = useCallback((event: PointerEvent) => {
    const target = getElementFromPoint(event);

    if (!target) {
      return;
    }

    const { top, left, width, height } = target.getBoundingClientRect();
    const fiberNode = findFirstFiberWithDebugSource(target);

    if (!fiberNode) {
      return;
    }

    setTargetFiberNodeWithDomElement(fiberNode);

    const sourceComponentResult = findSourceComponent(fiberNode);

    setSourceComponent(sourceComponentResult);

    const firstFiberNodeType = findFirstNonIgnoredComponent(fiberNode);

    setComponentPath(
      sourceComponentResult?.type &&
        firstFiberNodeType &&
        sourceComponentResult.type !== firstFiberNodeType
        ? `${sourceComponentResult.type}: ${firstFiberNodeType}`
        : sourceComponentResult?.type
        ? sourceComponentResult.type
        : null
    );

    setHighlightPosition({
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${left}px, ${top}px)`,
    });
  }, []);

  const handleClickAtPositionOfInspectedElement = useCallback(
    async (event: MouseEvent) => {
      const target = getElementFromPoint(event);

      if (!target) {
        setIsInspecting(false);
        return;
      }

      const componentData = await getInspectedElementData({
        target,
        httpService: core.http,
        targetFiberNodeWithDomElement,
        componentPath,
        sourceComponent,
      });

      if (!componentData) {
        setIsInspecting(false);
        return;
      }

      const flyout = core.overlays.openFlyout(
        toMountPoint(
          <InspectFlyout componentData={componentData} target={target} />,
          core.rendering
        ),
        flyoutOptions
      );

      flyout.onClose.then(() => {
        setFlyoutOverlayRef(undefined);
      });

      setFlyoutOverlayRef(flyout);
      setIsInspecting(false);
    },
    [
      core,
      componentPath,
      sourceComponent,
      targetFiberNodeWithDomElement,
      setIsInspecting,
      setFlyoutOverlayRef,
    ]
  );

  useEffect(() => {
    /**
     * Capture all click events on the document and stop them from propagating.
     * EuiWindowEvent can't be used here as it doesn't allow for setting 'capture: true'.
     */
    const handleMouseEvent = (event: MouseEvent) => {
      handleEventPropagation({ event, callback: handleClickAtPositionOfInspectedElement });
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
    document.addEventListener('pointerdown', handleMouseEvent, true);
    document.addEventListener('click', handleMouseEvent, true);

    return () => {
      document.head.removeChild(forceCrossHairCursor);
      document.removeEventListener('pointerdown', handleMouseEvent, true);
      document.removeEventListener('click', handleMouseEvent, true);
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
