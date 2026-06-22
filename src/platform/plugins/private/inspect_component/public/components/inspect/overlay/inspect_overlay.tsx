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
import { Global } from '@emotion/react';
import type { CoreStart, OverlayRef } from '@kbn/core/public';
import { EuiPortal, EuiWindowEvent, transparentize, useEuiTheme } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { isEscapeKey } from '../../../lib/keyboard_shortcut/keyboard_shortcut';
import { findFirstFiberWithDebugSource } from '../../../lib/fiber/find_first_fiber_with_debug_source';
import { handleEventPropagation } from '../../../lib/dom/handle_event_propagation';
import { getInspectedElementData } from '../../../lib/get_inspected_element_data';
import { getElementFromPoint } from '../../../lib/dom/get_element_from_point';
import { findSourceComponent } from '../../../lib/fiber/find_source_component';
import { InspectFlyout, flyoutOptions } from '../flyout/inspect_flyout';
import { InspectHighlight } from './inspect_highlight';
import {
  INSPECT_BUTTON_TEST_SUBJ,
  INSPECT_FLYOUT_ID,
  INSPECT_OVERLAY_ID,
} from '../../../lib/constants';
import type { ReactFiberNode, SourceComponent } from '../../../lib/fiber/types';

interface Props {
  core: CoreStart;
  branch: string;
  setFlyoutOverlayRef: Dispatch<SetStateAction<OverlayRef | null>>;
  setIsInspecting: Dispatch<SetStateAction<boolean>>;
}

/**
 * InspectOverlay renders an overlay over the entire viewport when inspect mode is enabled.
 * It highlights HTML elements as they get hovered over.
 */
export const InspectOverlay = ({ core, branch, setFlyoutOverlayRef, setIsInspecting }: Props) => {
  const { euiTheme } = useEuiTheme();
  const [highlightPosition, setHighlightPosition] = useState<CSSProperties>({});
  const [sourceComponent, setSourceComponent] = useState<SourceComponent | null>(null);
  const [targetFiberNode, setTargetFiberNode] = useState<ReactFiberNode | null>(null);

  /**
   * 'pointer-events: none' is required for {@link handleEventPropagation} to work properly.
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

  const handleKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (isEscapeKey(event)) {
        event.preventDefault();
        setIsInspecting(false);
      }
    },
    [setIsInspecting]
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

    setTargetFiberNode(fiberNode);

    const sourceComponentResult = findSourceComponent(fiberNode);

    setSourceComponent(sourceComponentResult);

    setHighlightPosition({
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${left}px, ${top}px)`,
    });
  }, []);

  const handleClickAtPositionOfInspectedElement = useCallback(
    async (event: MouseEvent) => {
      const target = getElementFromPoint(event);

      // No inspectable element under the cursor (e.g. click on the flyout
      // itself, or on a non-inspectable region). Keep the inspector active.
      if (!target) return;

      const componentData = await getInspectedElementData({
        httpService: core.http,
        targetFiberNode,
        sourceComponent,
      });

      // Clicked on something with no resolvable source component — just
      // ignore the click and stay in inspect mode.
      if (!componentData) return;

      const flyout = core.overlays.openFlyout(
        toMountPoint(
          <InspectFlyout
            componentData={componentData}
            target={target}
            branch={branch}
            core={core}
          />,
          core.rendering
        ),
        {
          ...flyoutOptions,
          // `options.onClose` is only invoked when EuiFlyout itself triggers
          // close (X button or Escape inside the flyout), NOT when
          // `openFlyout` programmatically replaces an existing flyout. That's
          // exactly the distinction we need: a *user* close should exit
          // inspect mode, but re-targeting via click (which replaces the
          // flyout) should not.
          onClose: (f) => {
            f.close();
            setFlyoutOverlayRef(null);
            setIsInspecting(false);
          },
        }
      );

      setFlyoutOverlayRef(flyout);
    },
    [core, branch, sourceComponent, targetFiberNode, setIsInspecting, setFlyoutOverlayRef]
  );

  useEffect(() => {
    /**
     * Capture all click events on the document and stop them from propagating.
     * 'EuiWindowEvent' can't be used here as it doesn't allow for setting 'capture: true'.
     *
     * Events whose target is inside the inspector's own flyout are passed
     * through unchanged so that flyout controls (buttons, inputs, the close
     * button) keep working — the flyout is part of the inspector UI, not a
     * click target for inspection.
     */
    const handleMouseEvent = (event: MouseEvent) => {
      const eventTarget = event.target;
      if (eventTarget instanceof Element) {
        // Clicks on the inspector flyout (its buttons, inputs, etc.) and
        // clicks on the inspect-mode toggle button itself must pass through
        // unhindered — they're part of the inspector UI, not click targets
        // for inspection.
        if (eventTarget.closest(`#${INSPECT_FLYOUT_ID}`) !== null) return;
        if (eventTarget.closest(`[data-test-subj="${INSPECT_BUTTON_TEST_SUBJ}"]`) !== null) return;
      }
      handleEventPropagation({ event, callback: handleClickAtPositionOfInspectedElement });
    };

    document.addEventListener('pointerdown', handleMouseEvent, true);
    document.addEventListener('click', handleMouseEvent, true);

    return () => {
      document.removeEventListener('pointerdown', handleMouseEvent, true);
      document.removeEventListener('click', handleMouseEvent, true);
    };
  }, [handleClickAtPositionOfInspectedElement]);

  const overlayContent = useMemo(
    () => (
      <React.Fragment>
        <Global
          styles={{
            // This is a workaround which forces the crosshair cursor when inspecting.
            'body *': {
              cursor: 'crosshair !important',
            },
            // The inspector flyout is part of the inspector UI, not a target
            // for inspection — restore the default cursor inside it so its
            // controls remain usable. ID-based selector has higher specificity
            // than `body *` so this override wins.
            [`#${INSPECT_FLYOUT_ID}, #${INSPECT_FLYOUT_ID} *`]: {
              cursor: 'auto !important',
            },
          }}
        />
        <div
          className={overlayCss}
          id={INSPECT_OVERLAY_ID}
          data-test-subj="inspectOverlayContainer"
        >
          <EuiWindowEvent event="keydown" handler={handleKeydown} />
          <EuiWindowEvent event="pointermove" handler={handlePointerMove} />
          <InspectHighlight
            currentPosition={highlightPosition}
            path={sourceComponent?.type || null}
          />
        </div>
      </React.Fragment>
    ),
    [overlayCss, highlightPosition, sourceComponent?.type, handlePointerMove, handleKeydown]
  );

  return <EuiPortal>{overlayContent}</EuiPortal>;
};
