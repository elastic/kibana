/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiResizableContainer,
  useEuiTheme,
  useGeneratedHtmlId,
  useResizeObserver,
} from '@elastic/eui';
import type { ResizeTrigger } from '@elastic/eui/src/components/resizable_container/types';
import { css } from '@emotion/react';
import { isEqual, round } from 'lodash';
import type { ReactElement, RefObject } from 'react';
import React, { useCallback, useEffect, useState } from 'react';

const percentToPixels = (containerHeight: number, percentage: number) =>
  Math.round(containerHeight * (percentage / 100));

const pixelsToPercent = (containerHeight: number, pixels: number) =>
  (pixels / containerHeight) * 100;

export const PanelsResizable = ({
  className,
  resizeRef,
  topPanelHeight,
  minTopPanelHeight,
  minMainPanelHeight,
  topPanel,
  mainPanel,
  onTopPanelHeightChange,
}: {
  className?: string;
  resizeRef: RefObject<HTMLDivElement>;
  topPanelHeight: number;
  minTopPanelHeight: number;
  minMainPanelHeight: number;
  topPanel: ReactElement;
  mainPanel: ReactElement;
  onTopPanelHeightChange?: (topPanelHeight: number) => void;
}) => {
  const topPanelId = useGeneratedHtmlId({ prefix: 'topPanel' });
  const { height: containerHeight } = useResizeObserver(resizeRef.current);
  const [panelSizes, setPanelSizes] = useState({ topPanelSize: 0, mainPanelSize: 0 });

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
  const resizeWithPortalsHackButtonCss = css`
    z-index: 3;
  `;
  const resizeWithPortalsHackOverlayCss = css`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2;
  `;

  // We convert the top panel height from a percentage of the container height
  // to a pixel value and emit the change to the parent component. We also convert
  // the pixel value back to a percentage before updating the panel sizes to avoid
  // rounding issues with the isEqual check in the effect below.
  const onPanelSizeChange = useCallback(
    ({ [topPanelId]: topPanelSize }: { [key: string]: number }) => {
      const newTopPanelHeight = percentToPixels(containerHeight, topPanelSize);
      const newTopPanelSize = pixelsToPercent(containerHeight, newTopPanelHeight);

      setPanelSizes({
        topPanelSize: round(newTopPanelSize, 4),
        mainPanelSize: round(100 - newTopPanelSize, 4),
      });

      onTopPanelHeightChange?.(newTopPanelHeight);
    },
    [containerHeight, onTopPanelHeightChange, topPanelId]
  );

  // This effect will update the panel sizes based on the top panel height whenever
  // it or the container height changes. This allows us to keep the height of the
  // top panel fixed when the window is resized.
  useEffect(() => {
    if (!containerHeight) {
      return;
    }

    let topPanelSize: number;
    let mainPanelSize: number;

    // If the container height is less than the minimum main content height
    // plus the current top panel height, then we need to make some adjustments.
    if (containerHeight < minMainPanelHeight + topPanelHeight) {
      const newTopPanelHeight = containerHeight - minMainPanelHeight;

      // Try to make the top panel height fit within the container, but if it
      // doesn't then just use the minimum heights.
      if (newTopPanelHeight < minTopPanelHeight) {
        topPanelSize = pixelsToPercent(containerHeight, minTopPanelHeight);
        mainPanelSize = pixelsToPercent(containerHeight, minMainPanelHeight);
      } else {
        topPanelSize = pixelsToPercent(containerHeight, newTopPanelHeight);
        mainPanelSize = 100 - topPanelSize;
      }
    } else {
      topPanelSize = pixelsToPercent(containerHeight, topPanelHeight);
      mainPanelSize = 100 - topPanelSize;
    }

    const newPanelSizes = {
      topPanelSize: round(topPanelSize, 4),
      mainPanelSize: round(mainPanelSize, 4),
    };

    // Skip updating the panel sizes if they haven't changed
    // since onPanelSizeChange will also trigger this effect.
    if (!isEqual(panelSizes, newPanelSizes)) {
      setPanelSizes(newPanelSizes);
    }
  }, [containerHeight, minMainPanelHeight, minTopPanelHeight, panelSizes, topPanelHeight]);

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

  const { euiTheme } = useEuiTheme();
  const buttonCss = css`
    && {
      margin-top: -${euiTheme.size.base};
      margin-bottom: 0;
    }
  `;

  return (
    <EuiResizableContainer
      className={className}
      direction="vertical"
      onPanelWidthChange={onPanelSizeChange}
      onResizeStart={onResizeStart}
      onResizeEnd={onResizeEnd}
      data-test-subj="unifiedHistogramResizableContainer"
    >
      {(EuiResizablePanel, EuiResizableButton) => (
        <>
          <EuiResizablePanel
            id={topPanelId}
            minSize={`${minTopPanelHeight}px`}
            size={panelSizes.topPanelSize}
            paddingSize="none"
            data-test-subj="unifiedHistogramResizablePanelTop"
          >
            {topPanel}
          </EuiResizablePanel>
          <EuiResizableButton
            css={[resizeWithPortalsHackButtonCss, buttonCss]}
            data-test-subj="unifiedHistogramResizableButton"
          />
          <EuiResizablePanel
            minSize={`${minMainPanelHeight}px`}
            size={panelSizes.mainPanelSize}
            paddingSize="none"
            data-test-subj="unifiedHistogramResizablePanelMain"
          >
            {mainPanel}
          </EuiResizablePanel>
          {resizeWithPortalsHackIsResizing ? <div css={resizeWithPortalsHackOverlayCss} /> : <></>}
        </>
      )}
    </EuiResizableContainer>
  );
};
