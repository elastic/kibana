/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { CSSProperties, Dispatch, DragEvent, SetStateAction } from 'react';
import { css } from '@emotion/css';
import { Global } from '@emotion/react';
import type { CoreStart, OverlayRef } from '@kbn/core/public';
import {
  EuiPortal,
  EuiWindowEvent,
  copyToClipboard,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { findFiberWithDebugSource, findSourceComponentName } from '@kbn/react-fiber';
import type { ElementFiber } from '@kbn/react-fiber';
import {
  isCopyKeyboardShortcut,
  isEscapeKey,
} from '../../../lib/keyboard_shortcut/keyboard_shortcut';
import { handleEventPropagation } from '../../../lib/dom/handle_event_propagation';
import { getInspectedElementData } from '../../../lib/get_inspected_element_data';
import { getElementFromPoint } from '../../../lib/dom/get_element_from_point';
import { buildGrabContext, getRepoRoot } from '../../../lib/grab/build_grab_context';
import { fetchComponentData } from '../../../api/fetch_component_data';
import { InspectFlyout, flyoutOptions } from '../flyout/inspect_flyout';
import { InspectHighlight } from './inspect_highlight';
import { GRAB_FEEDBACK_DURATION_MS, INSPECT_OVERLAY_ID } from '../../../lib/constants';
import type { InspectMode, SourceComponent } from '../../../lib/types';

type GrabStatus = 'idle' | 'copied' | 'failed';

const INTERCEPTED_EVENTS = ['pointerdown', 'mousedown', 'mouseup', 'click'] as const;

const GRAB_STATUS_LABELS: Record<Exclude<GrabStatus, 'idle'>, string> = {
  copied: i18n.translate('kbnInspectComponent.grab.copiedLabel', {
    defaultMessage: 'Copied to clipboard',
  }),
  failed: i18n.translate('kbnInspectComponent.grab.copyFailedLabel', {
    defaultMessage: 'Unable to copy to clipboard',
  }),
};

interface Props {
  core: CoreStart;
  branch: string;
  mode?: InspectMode;
  setFlyoutOverlayRef: Dispatch<SetStateAction<OverlayRef | null>>;
  setIsInspecting: (isInspecting: boolean) => void;
}

/**
 * InspectOverlay renders an overlay over the entire viewport when inspect mode is enabled.
 * It highlights HTML elements as they get hovered over.
 */
export const InspectOverlay = ({
  core,
  branch,
  mode = 'inspect',
  setFlyoutOverlayRef,
  setIsInspecting,
}: Props) => {
  const { euiTheme } = useEuiTheme();
  const [highlightPosition, setHighlightPosition] = useState<CSSProperties | null>(null);
  const [sourceComponent, setSourceComponent] = useState<SourceComponent | null>(null);
  const [target, setTarget] = useState<ElementFiber | null>(null);
  const [grabStatus, setGrabStatus] = useState<GrabStatus>('idle');
  const [repoRoot, setRepoRoot] = useState<string | null>(null);
  const repoRootRequest = useRef<Promise<void> | null>(null);
  /** The element under the cursor, so it can be grabbed with the keyboard too. */
  const hoveredElement = useRef<HTMLElement | null>(null);
  const isGrabMode = mode === 'grab';

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

  /**
   * Resolves the repository root once, so grab context can be built synchronously
   * (native drag and drop requires the payload to be set during 'dragstart').
   */
  const resolveRepoRoot = useCallback(
    (fileName: string) => {
      if (repoRootRequest.current) return;

      repoRootRequest.current = fetchComponentData({ httpService: core.http, fileName }).then(
        (response) => {
          if (response) setRepoRoot(getRepoRoot(fileName, response.relativePath));
        }
      );
    },
    [core.http]
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const element = getElementFromPoint(event);
      const elementFiber = element ? findFiberWithDebugSource(element) : null;

      /** Nothing to inspect, e.g. the developer toolbar, so no highlight may linger over it. */
      if (!element || !elementFiber) {
        hoveredElement.current = null;
        setTarget(null);
        setSourceComponent(null);
        setHighlightPosition(null);
        return;
      }

      const { top, left, width, height } = element.getBoundingClientRect();

      hoveredElement.current = element;
      setTarget(elementFiber);

      const sourceComponentName = findSourceComponentName(elementFiber.fiber);

      setSourceComponent(
        sourceComponentName ? { type: sourceComponentName, element: elementFiber.element } : null
      );

      setHighlightPosition({
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(${left}px, ${top}px)`,
      });

      if (isGrabMode) {
        resolveRepoRoot(elementFiber.source.fileName);
      }
    },
    [isGrabMode, resolveRepoRoot]
  );

  /**
   * Makes the inspected element itself the drag image and carries its context as plain text,
   * so it can be dropped straight into an agent chat, a terminal or a message box.
   * The clipboard copy stays silent here, the feedback badge is reserved for clicks.
   */
  const handleDragStart = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      const draggedElement = getElementFromPoint(event.nativeEvent);

      if (!draggedElement) {
        event.preventDefault();
        return;
      }

      const context = buildGrabContext({
        element: draggedElement,
        fiber: target?.fiber ?? null,
        repoRoot,
      });
      const { top, left } = draggedElement.getBoundingClientRect();

      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('text/plain', context);
      event.dataTransfer.setDragImage(draggedElement, event.clientX - left, event.clientY - top);
      copyToClipboard(context);
    },
    [target, repoRoot]
  );

  /** Resets the copied / failed feedback back to the component label after a short while. */
  useEffect(() => {
    if (grabStatus === 'idle') return;

    const timeoutId = window.setTimeout(() => setGrabStatus('idle'), GRAB_FEEDBACK_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [grabStatus]);

  /** Copies the context of an element to the clipboard and shows the outcome on the highlight. */
  const copyGrabContext = useCallback(
    (element: HTMLElement) => {
      const context = buildGrabContext({ element, fiber: target?.fiber ?? null, repoRoot });

      setGrabStatus(copyToClipboard(context) ? 'copied' : 'failed');
    },
    [target, repoRoot]
  );

  const handleKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (isEscapeKey(event)) {
        event.preventDefault();
        setIsInspecting(false);
        return;
      }

      /** ⌘ + C / Ctrl + C grabs the hovered element, so the cursor doesn't have to leave it. */
      if (isGrabMode && hoveredElement.current && isCopyKeyboardShortcut(event)) {
        event.preventDefault();
        copyGrabContext(hoveredElement.current);
      }
    },
    [isGrabMode, copyGrabContext, setIsInspecting]
  );

  const handleClickAtPositionOfInspectedElement = useCallback(
    async (event: MouseEvent) => {
      const clickedElement = getElementFromPoint(event);

      if (!clickedElement) {
        setIsInspecting(false);
        return;
      }

      if (isGrabMode) {
        copyGrabContext(clickedElement);
        return;
      }

      const componentData = await getInspectedElementData({
        httpService: core.http,
        target,
        sourceComponent,
      });

      if (!componentData) {
        setIsInspecting(false);
        return;
      }

      const flyout = core.overlays.openFlyout(
        toMountPoint(
          <InspectFlyout componentData={componentData} target={clickedElement} branch={branch} />,
          core.rendering
        ),
        flyoutOptions
      );

      flyout.onClose.then(() => {
        setFlyoutOverlayRef(null);
      });

      setFlyoutOverlayRef(flyout);
      setIsInspecting(false);
    },
    [
      core,
      branch,
      isGrabMode,
      copyGrabContext,
      sourceComponent,
      target,
      setIsInspecting,
      setFlyoutOverlayRef,
    ]
  );

  useEffect(() => {
    /**
     * Capture all click events on the document and stop them from propagating.
     * 'EuiWindowEvent' can't be used here as it doesn't allow for setting 'capture: true'.
     * The mouse events only reach the listener from the overlay, elsewhere the cancelled
     * 'pointerdown' already suppresses them.
     */
    const handleMouseEvent = (event: MouseEvent) => {
      handleEventPropagation({ event, callback: handleClickAtPositionOfInspectedElement });
    };

    INTERCEPTED_EVENTS.forEach((type) => document.addEventListener(type, handleMouseEvent, true));

    return () => {
      INTERCEPTED_EVENTS.forEach((type) =>
        document.removeEventListener(type, handleMouseEvent, true)
      );
    };
  }, [handleClickAtPositionOfInspectedElement]);

  /** Grab mode shows a bare highlight, only the copy feedback is labelled. */
  const highlightProps = useMemo(() => {
    if (!isGrabMode) {
      return { path: sourceComponent?.type ?? null };
    }

    if (grabStatus === 'idle') {
      return { path: null };
    }

    return {
      path: GRAB_STATUS_LABELS[grabStatus],
      badgeColor: grabStatus === 'copied' ? 'success' : 'danger',
      badgeIconType: grabStatus === 'copied' ? 'check' : 'warning',
    };
  }, [isGrabMode, grabStatus, sourceComponent]);

  const overlayContent = useMemo(
    () => (
      <React.Fragment>
        <Global
          styles={{
            // This is a workaround which forces the crosshair cursor when inspecting,
            // the overlay itself is excluded so the draggable highlight keeps its grab cursor.
            [`body *:not(#${INSPECT_OVERLAY_ID} *)`]: {
              cursor: 'crosshair !important',
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
          {highlightPosition && (
            <InspectHighlight
              currentPosition={highlightPosition}
              onDragStart={isGrabMode ? handleDragStart : undefined}
              {...highlightProps}
            />
          )}
        </div>
      </React.Fragment>
    ),
    [
      overlayCss,
      highlightPosition,
      highlightProps,
      isGrabMode,
      handleDragStart,
      handlePointerMove,
      handleKeydown,
    ]
  );

  return <EuiPortal>{overlayContent}</EuiPortal>;
};
