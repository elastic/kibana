/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiResizableContainer, useGeneratedHtmlId, useResizeObserver } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ReactElement, RefObject } from 'react';
import React, { useCallback, useEffect, useState } from 'react';

const percentToPixels = (containerHeight: number, percentage: number) =>
  Math.round(containerHeight * (percentage / 100));

const pixelsToPercent = (containerHeight: number, pixels: number) =>
  +((pixels / containerHeight) * 100).toFixed(4);

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
  onTopPanelHeightChange?: (height: number) => void;
}) => {
  const topPanelId = useGeneratedHtmlId({ prefix: 'topPanel' });
  const { height: containerHeight } = useResizeObserver(resizeRef.current);
  const [panelSizes, setPanelSizes] = useState({ topPanelSize: 0, mainPanelSize: 0 });

  // EuiResizableContainer doesn't work properly when used with react-reverse-portal and
  // will cancel the resize. To work around this we keep track of when resizes start and
  // end to toggle the rendering of a transparent overlay which prevents the cancellation.
  // EUI issue: https://github.com/elastic/eui/issues/6199
  const [resizeWithPortalsHackIsResizing, setResizeWithPortalsHackIsResizing] = useState(false);
  const enableResizeWithPortalsHack = () => setResizeWithPortalsHackIsResizing(true);
  const disableResizeWithPortalsHack = () => setResizeWithPortalsHackIsResizing(false);
  const resizeWithPortalsHackFillCss = css`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  `;
  const resizeWithPortalsHackButtonCss = css`
    z-index: 3;
  `;
  const resizeWithPortalsHackButtonInnerCss = css`
    ${resizeWithPortalsHackFillCss}
    z-index: 1;
  `;
  const resizeWithPortalsHackOverlayCss = css`
    ${resizeWithPortalsHackFillCss}
    z-index: 2;
  `;

  // Instead of setting the panel sizes directly, we convert the top panel height
  // from a percentage of the container height to a pixel value. This will trigger
  // the effect below to update the panel sizes.
  const onPanelSizeChange = useCallback(
    ({ [topPanelId]: topPanelSize }: { [key: string]: number }) => {
      const newTopPanelHeight = percentToPixels(containerHeight, topPanelSize);

      if (newTopPanelHeight !== topPanelHeight) {
        onTopPanelHeightChange?.(newTopPanelHeight);
      }
    },
    [containerHeight, onTopPanelHeightChange, topPanelHeight, topPanelId]
  );

  // This effect will update the panel sizes based on the top panel height whenever
  // it or the container height changes. This allows us to keep the height of the
  // top panel panel fixed when the window is resized.
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

    setPanelSizes({ topPanelSize, mainPanelSize });
  }, [containerHeight, topPanelHeight, minTopPanelHeight, minMainPanelHeight]);

  const onResizeEnd = () => {
    // We don't want the resize button to retain focus after the resize is complete,
    // but EuiResizableContainer will force focus it onClick. To work around this we
    // use setTimeout to wait until after onClick has been called before blurring.
    if (resizeWithPortalsHackIsResizing && document.activeElement instanceof HTMLElement) {
      const button = document.activeElement;
      setTimeout(() => {
        button.blur();
      });
    }

    disableResizeWithPortalsHack();
  };

  return (
    <div
      className="eui-fullHeight"
      onMouseUp={onResizeEnd}
      onMouseLeave={onResizeEnd}
      onTouchEnd={onResizeEnd}
      data-test-subj="unifiedHistogramResizableContainerWrapper"
    >
      <EuiResizableContainer
        className={className}
        direction="vertical"
        onPanelWidthChange={onPanelSizeChange}
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
              css={resizeWithPortalsHackButtonCss}
              data-test-subj="unifiedHistogramResizableButton"
            >
              <span
                onMouseDown={enableResizeWithPortalsHack}
                onTouchStart={enableResizeWithPortalsHack}
                css={resizeWithPortalsHackButtonInnerCss}
                data-test-subj="unifiedHistogramResizableButtonInner"
              />
            </EuiResizableButton>
            <EuiResizablePanel
              minSize={`${minMainPanelHeight}px`}
              size={panelSizes.mainPanelSize}
              paddingSize="none"
              data-test-subj="unifiedHistogramResizablePanelMain"
            >
              {mainPanel}
            </EuiResizablePanel>
            {resizeWithPortalsHackIsResizing ? (
              <div css={resizeWithPortalsHackOverlayCss} />
            ) : (
              <></>
            )}
          </>
        )}
      </EuiResizableContainer>
    </div>
  );
};
