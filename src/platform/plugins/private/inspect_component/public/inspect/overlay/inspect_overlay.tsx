/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, OverlayRef } from '@kbn/core/public';
import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import React, { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { css } from '@emotion/css';
import { EuiWindowEvent, transparentize, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import { findReactComponentPath, getElementFromPoint, getInspectedElementData } from '../../utils';
import { InspectHighlight } from './inspect_highlight';

interface Props {
  core: CoreStart;
  setFlyoutRef: Dispatch<SetStateAction<OverlayRef | undefined>>;
  setIsInspecting: Dispatch<SetStateAction<boolean>>;
}

export const InspectOverlay = ({ core, setFlyoutRef, setIsInspecting }: Props) => {
  const [highlightPosition, setHighlightPosition] = useState<CSSProperties>({});
  const [componentPath, setComponentPath] = useState<string | undefined>();
  const [sourceComponent, setSourceComponent] = useState<string | undefined>();

  const overlayId = useGeneratedHtmlId({
    prefix: 'inspectOverlay',
  });

  const { euiTheme } = useEuiTheme();

  const overlayCss = useMemo(
    () => css`
      background-color: ${transparentize(euiTheme.colors.backgroundFilledText, 0.2)};
      cursor: crosshair;
      inset: 0;
      position: fixed;
      z-index: ${Number(euiTheme.levels.modal) + 1};
    `,
    [euiTheme.colors.backgroundFilledText, euiTheme.levels.modal]
  );

  const handleClick = useCallback(
    async (event: PointerEvent) => {
      await getInspectedElementData({
        event,
        core,
        componentPath,
        overlayId,
        euiTheme,
        setFlyoutRef,
        setIsInspecting,
        sourceComponent,
      });
    },
    [componentPath, core, overlayId, euiTheme, setFlyoutRef, setIsInspecting, sourceComponent]
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
      <div className={overlayCss} id={overlayId}>
        <EuiWindowEvent event="pointermove" handler={handlePointerMove} />
        <EuiWindowEvent event="pointerdown" handler={handleClick} />
        <InspectHighlight currentPosition={highlightPosition} path={componentPath} />
      </div>
    ),
    [overlayCss, overlayId, handlePointerMove, handleClick, highlightPosition, componentPath]
  );

  return createPortal(overlayContent, document.body);
};
