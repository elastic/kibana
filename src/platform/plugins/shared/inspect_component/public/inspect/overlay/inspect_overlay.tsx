/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import type { Dispatch, SetStateAction, CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { EuiWindowEvent, transparentize, useEuiTheme } from '@elastic/eui';
import type { CoreStart, OverlayRef } from '@kbn/core/public';
import { css } from '@emotion/css';
import { INSPECT_OVERLAY_ID } from '../../../common';
import { InspectHighlight } from './inspect_highlight';
import { getElementFromPoint, getInspectedElementData } from '../../utils';

interface Props {
  core: CoreStart;
  setFlyoutRef: Dispatch<SetStateAction<OverlayRef | undefined>>;
  setIsInspecting: Dispatch<SetStateAction<boolean>>;
}

export const InspectOverlay = ({ core, setFlyoutRef, setIsInspecting }: Props) => {
  const { euiTheme } = useEuiTheme();
  const [highlightPosition, setHighlightPosition] = useState<CSSProperties>({});

  const overlayCss = css`
    position: fixed;
    inset: 0;
    background-color: ${transparentize(euiTheme.colors.backgroundFilledText, 0.2)};
    z-index: ${Number(euiTheme.levels.modal) + 1};
    cursor: crosshair;
  `;

  const handleClick = async (event: PointerEvent) => {
    await getInspectedElementData({
      event,
      core,
      setFlyoutRef,
      setIsInspecting,
    });
  };

  const handlePointerMove = (event: PointerEvent) => {
    const target = getElementFromPoint({ event });
    if (!target) return;

    const { top, left, width, height } = target.getBoundingClientRect();

    setHighlightPosition({
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${left}px, ${top}px)`,
    });
  };

  return createPortal(
    <div className={overlayCss} id={INSPECT_OVERLAY_ID}>
      <EuiWindowEvent event="pointermove" handler={handlePointerMove} />
      <EuiWindowEvent event="pointerdown" handler={handleClick} />
      <InspectHighlight currentPosition={highlightPosition} />
    </div>,
    document.body
  );
};
