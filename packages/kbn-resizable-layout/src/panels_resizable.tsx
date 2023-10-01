/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiResizableContainer, useGeneratedHtmlId, useResizeObserver } from '@elastic/eui';
import type { ResizeTrigger } from '@elastic/eui/src/components/resizable_container/types';
import { css } from '@emotion/react';
import { isEqual, round } from 'lodash';
import type { ReactElement } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import { ResizableLayoutDirection } from '../types';
import { getContainerSize, percentToPixels, pixelsToPercent } from './utils';

export const PanelsResizable = ({
  className,
  direction,
  container,
  fixedPanelSize,
  minFixedPanelSize,
  minFlexPanelSize,
  panelSizes,
  fixedPanel,
  flexPanel,
  resizeButtonClassName,
  ['data-test-subj']: dataTestSubj = 'resizableLayout',
  onFixedPanelSizeChange,
  setPanelSizes,
}: {
  className?: string;
  direction: ResizableLayoutDirection;
  container: HTMLElement | null;
  fixedPanelSize: number;
  minFixedPanelSize: number;
  minFlexPanelSize: number;
  panelSizes: {
    fixedPanelSizePct: number;
    flexPanelSizePct: number;
  };
  fixedPanel: ReactElement;
  flexPanel: ReactElement;
  resizeButtonClassName?: string;
  ['data-test-subj']?: string;
  onFixedPanelSizeChange?: (fixedPanelSize: number) => void;
  setPanelSizes: (panelSizes: { fixedPanelSizePct: number; flexPanelSizePct: number }) => void;
}) => {
  const fixedPanelId = useGeneratedHtmlId({ prefix: 'fixedPanel' });
  const { height: containerHeight, width: containerWidth } = useResizeObserver(container);
  const containerSize = getContainerSize(direction, containerWidth, containerHeight);

  // EuiResizableContainer doesn't work properly when used with react-reverse-portal and
  // will cancel the resize. To work around this we keep track of when resizes start and
  // end to toggle the rendering of a transparent overlay which prevents the cancellation.
  // EUI issue: https://github.com/elastic/eui/issues/6199
  const [resizeWithPortalsHackIsResizing, setResizeWithPortalsHackIsResizing] = useState(false);
  const enableResizeWithPortalsHack = useCallback(
    () => setResizeWithPortalsHackIsResizing(true),
    []
  );
  const disableResizeWithPortalsHack = useCallback(
    () => setResizeWithPortalsHackIsResizing(false),
    []
  );
  const defaultButtonCss = css`
    z-index: 3;
  `;
  const resizeWithPortalsHackButtonCss = css`
    z-index: 4;
  `;
  const resizeWithPortalsHackOverlayCss = css`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 3;
  `;

  // We convert the top panel size from a percentage of the container size
  // to a pixel value and emit the change to the parent component. We also convert
  // the pixel value back to a percentage before updating the panel sizes to avoid
  // rounding issues with the isEqual check in the effect below.
  const onPanelSizeChange = useCallback(
    ({ [fixedPanelId]: currentFixedPanelSize }: { [key: string]: number }) => {
      const newFixedPanelSizePx = percentToPixels(containerSize, currentFixedPanelSize);
      const newFixedPanelSizePct = pixelsToPercent(containerSize, newFixedPanelSizePx);

      setPanelSizes({
        fixedPanelSizePct: round(newFixedPanelSizePct, 4),
        flexPanelSizePct: round(100 - newFixedPanelSizePct, 4),
      });

      onFixedPanelSizeChange?.(newFixedPanelSizePx);
    },
    [fixedPanelId, containerSize, setPanelSizes, onFixedPanelSizeChange]
  );

  // This effect will update the panel sizes based on the top panel size whenever
  // it or the container size changes. This allows us to keep the size of the
  // top panel fixed when the window is resized.
  useEffect(() => {
    if (!containerSize) {
      return;
    }

    let fixedPanelSizePct: number;
    let flexPanelSizePct: number;

    // If the container size is less than the minimum main content size
    // plus the current top panel size, then we need to make some adjustments.
    if (containerSize < minFlexPanelSize + fixedPanelSize) {
      const newFixedPanelSize = containerSize - minFlexPanelSize;

      // Try to make the top panel size fit within the container, but if it
      // doesn't then just use the minimum sizes.
      if (newFixedPanelSize < minFixedPanelSize) {
        fixedPanelSizePct = pixelsToPercent(containerSize, minFixedPanelSize);
        flexPanelSizePct = pixelsToPercent(containerSize, minFlexPanelSize);
      } else {
        fixedPanelSizePct = pixelsToPercent(containerSize, newFixedPanelSize);
        flexPanelSizePct = 100 - fixedPanelSizePct;
      }
    } else {
      fixedPanelSizePct = pixelsToPercent(containerSize, fixedPanelSize);
      flexPanelSizePct = 100 - fixedPanelSizePct;
    }

    const newPanelSizes = {
      fixedPanelSizePct: round(fixedPanelSizePct, 4),
      flexPanelSizePct: round(flexPanelSizePct, 4),
    };

    // Skip updating the panel sizes if they haven't changed
    // since onPanelSizeChange will also trigger this effect.
    if (!isEqual(panelSizes, newPanelSizes)) {
      setPanelSizes(newPanelSizes);
    }
  }, [
    containerSize,
    fixedPanelSize,
    minFixedPanelSize,
    minFlexPanelSize,
    panelSizes,
    setPanelSizes,
  ]);

  const onResizeStart = useCallback(
    (trigger: ResizeTrigger) => {
      if (trigger !== 'pointer') {
        return;
      }

      enableResizeWithPortalsHack();
    },
    [enableResizeWithPortalsHack]
  );

  const onResizeEnd = useCallback(() => {
    if (!resizeWithPortalsHackIsResizing) {
      return;
    }

    // We don't want the resize button to retain focus after the resize is complete,
    // but EuiResizableContainer will force focus it onClick. To work around this we
    // use setTimeout to wait until after onClick has been called before blurring.
    if (document.activeElement instanceof HTMLElement) {
      const button = document.activeElement;
      setTimeout(() => {
        button.blur();
      });
    }

    disableResizeWithPortalsHack();
  }, [disableResizeWithPortalsHack, resizeWithPortalsHackIsResizing]);

  // Don't render EuiResizableContainer until we have have valid
  // panel sizes or it can cause the resize functionality to break.
  if (!panelSizes.fixedPanelSizePct && !panelSizes.flexPanelSizePct) {
    return null;
  }

  return (
    <EuiResizableContainer
      className={className}
      direction={direction}
      onPanelWidthChange={onPanelSizeChange}
      onResizeStart={onResizeStart}
      onResizeEnd={onResizeEnd}
      data-test-subj={`${dataTestSubj}ResizableContainer`}
      css={css`
        height: 100%;
      `}
    >
      {(EuiResizablePanel, EuiResizableButton) => (
        <>
          <EuiResizablePanel
            id={fixedPanelId}
            minSize={`${minFixedPanelSize}px`}
            size={panelSizes.fixedPanelSizePct}
            paddingSize="none"
            data-test-subj={`${dataTestSubj}ResizablePanelFixed`}
          >
            {fixedPanel}
          </EuiResizablePanel>
          <EuiResizableButton
            className={resizeButtonClassName}
            css={
              resizeWithPortalsHackIsResizing ? resizeWithPortalsHackButtonCss : defaultButtonCss
            }
            data-test-subj={`${dataTestSubj}ResizableButton`}
          />
          <EuiResizablePanel
            minSize={`${minFlexPanelSize}px`}
            size={panelSizes.flexPanelSizePct}
            paddingSize="none"
            data-test-subj={`${dataTestSubj}ResizablePanelFlex`}
          >
            {flexPanel}
          </EuiResizablePanel>
          {resizeWithPortalsHackIsResizing ? <div css={resizeWithPortalsHackOverlayCss} /> : <></>}
        </>
      )}
    </EuiResizableContainer>
  );
};
