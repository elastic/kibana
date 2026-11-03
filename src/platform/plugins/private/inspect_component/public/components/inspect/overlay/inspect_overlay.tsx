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
import { isEscapeKey } from '../../../lib/keyboard_shortcut/keyboard_shortcut';
import { findFirstFiberWithDebugSource } from '../../../lib/fiber/find_first_fiber_with_debug_source';
import { handleEventPropagation } from '../../../lib/dom/handle_event_propagation';
import { getInspectedElementData } from '../../../lib/get_inspected_element_data';
import { getElementFromPoint } from '../../../lib/dom/get_element_from_point';
import { findSourceComponent } from '../../../lib/fiber/find_source_component';
import { buildGrabContext, getGrabLabel, getRepoRoot } from '../../../lib/grab/build_grab_context';
import { fetchComponentData } from '../../../api/fetch_component_data';
import { InspectFlyout, flyoutOptions } from '../flyout/inspect_flyout';
import { InspectHighlight } from './inspect_highlight';
import { GRAB_FEEDBACK_DURATION_MS, INSPECT_OVERLAY_ID } from '../../../lib/constants';
import type { ReactFiberNode, SourceComponent } from '../../../lib/fiber/types';

/**
 * 'inspect' opens a flyout with component details,
 * 'grab' lets the element be dragged into a coding agent and copies its context to the clipboard.
 */
export type InspectMode = 'inspect' | 'grab';

type GrabStatus = 'idle' | 'copied' | 'failed';

const GRAB_HINT = i18n.translate('kbnInspectComponent.grab.hint', {
  defaultMessage: 'Drag into your agent · Click to copy · Esc to exit',
});

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
  setIsInspecting: Dispatch<SetStateAction<boolean>>;
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
  const [highlightPosition, setHighlightPosition] = useState<CSSProperties>({});
  const [sourceComponent, setSourceComponent] = useState<SourceComponent | null>(null);
  const [targetFiberNode, setTargetFiberNode] = useState<ReactFiberNode | null>(null);
  const [grabStatus, setGrabStatus] = useState<GrabStatus>('idle');
  const [repoRoot, setRepoRoot] = useState<string | null>(null);
  const repoRootRequest = useRef<Promise<void> | null>(null);
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

  const handleKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (isEscapeKey(event)) {
        event.preventDefault();
        setIsInspecting(false);
      }
    },
    [setIsInspecting]
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

      const fileName = fiberNode._debugSource?.fileName;
      if (isGrabMode && fileName) {
        resolveRepoRoot(fileName);
      }
    },
    [isGrabMode, resolveRepoRoot]
  );

  const copyGrabContext = useCallback(
    (context: string) => {
      setGrabStatus(copyToClipboard(context) ? 'copied' : 'failed');
    },
    [setGrabStatus]
  );

  /**
   * Makes the inspected element itself the drag image and carries its context as plain text,
   * so it can be dropped straight into an agent chat, a terminal or a message box.
   */
  const handleDragStart = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      const target = getElementFromPoint(event.nativeEvent);

      if (!target) {
        event.preventDefault();
        return;
      }

      const context = buildGrabContext({ element: target, targetFiberNode, repoRoot });
      const { top, left } = target.getBoundingClientRect();

      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('text/plain', context);
      event.dataTransfer.setDragImage(target, event.clientX - left, event.clientY - top);
      copyGrabContext(context);
    },
    [targetFiberNode, repoRoot, copyGrabContext]
  );

  /** Resets the copied / failed feedback back to the hint after a short while. */
  useEffect(() => {
    if (grabStatus === 'idle') return;

    const timeoutId = window.setTimeout(() => setGrabStatus('idle'), GRAB_FEEDBACK_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [grabStatus]);

  const handleClickAtPositionOfInspectedElement = useCallback(
    async (event: MouseEvent) => {
      const target = getElementFromPoint(event);

      if (!target) {
        setIsInspecting(false);
        return;
      }

      if (isGrabMode) {
        copyGrabContext(buildGrabContext({ element: target, targetFiberNode, repoRoot }));
        return;
      }

      const componentData = await getInspectedElementData({
        httpService: core.http,
        targetFiberNode,
        sourceComponent,
      });

      if (!componentData) {
        setIsInspecting(false);
        return;
      }

      const flyout = core.overlays.openFlyout(
        toMountPoint(
          <InspectFlyout componentData={componentData} target={target} branch={branch} />,
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
      repoRoot,
      sourceComponent,
      targetFiberNode,
      setIsInspecting,
      setFlyoutOverlayRef,
    ]
  );

  useEffect(() => {
    /**
     * Capture all click events on the document and stop them from propagating.
     * 'EuiWindowEvent' can't be used here as it doesn't allow for setting 'capture: true'.
     */
    const handleMouseEvent = (event: MouseEvent) => {
      handleEventPropagation({ event, callback: handleClickAtPositionOfInspectedElement });
    };

    document.addEventListener('pointerdown', handleMouseEvent, true);
    document.addEventListener('click', handleMouseEvent, true);

    return () => {
      document.removeEventListener('pointerdown', handleMouseEvent, true);
      document.removeEventListener('click', handleMouseEvent, true);
    };
  }, [handleClickAtPositionOfInspectedElement]);

  const highlightLabel =
    isGrabMode && sourceComponent && targetFiberNode?._debugSource
      ? getGrabLabel(sourceComponent.type, targetFiberNode._debugSource)
      : sourceComponent?.type ?? null;

  const highlightProps = useMemo(() => {
    if (!isGrabMode) {
      return { path: highlightLabel };
    }

    if (grabStatus !== 'idle') {
      return {
        path: GRAB_STATUS_LABELS[grabStatus],
        badgeColor: grabStatus === 'copied' ? 'success' : 'danger',
        badgeIconType: grabStatus === 'copied' ? 'check' : 'warning',
      };
    }

    return { path: highlightLabel, hint: GRAB_HINT };
  }, [isGrabMode, grabStatus, highlightLabel]);

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
          <InspectHighlight
            currentPosition={highlightPosition}
            onDragStart={isGrabMode ? handleDragStart : undefined}
            {...highlightProps}
          />
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
