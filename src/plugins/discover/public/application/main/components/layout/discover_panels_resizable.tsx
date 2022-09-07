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
import { css } from '@emotion/react';
import React, { ReactElement, RefObject, useCallback, useEffect, useState } from 'react';

const percentToPixels = (containerHeight: number, percentage: number) =>
  Math.round(containerHeight * (percentage / 100));

const pixelsToPercent = (containerHeight: number, pixels: number) =>
  +((pixels / containerHeight) * 100).toFixed(4);

export const DiscoverPanelsResizable = ({
  className,
  resizeRef,
  initialTopPanelHeight,
  topPanel,
  mainPanel,
}: {
  className?: string;
  resizeRef: RefObject<HTMLDivElement>;
  initialTopPanelHeight: number;
  topPanel: ReactElement;
  mainPanel: ReactElement;
}) => {
  const { euiTheme } = useEuiTheme();
  const minTopPanelHeight = euiTheme.base * 8;
  const minMainHeight = euiTheme.base * 10;
  const topPanelId = useGeneratedHtmlId({ prefix: 'topPanel' });
  const { height: containerHeight } = useResizeObserver(resizeRef.current);
  const [topPanelHeight, setTopPanelHeight] = useState(initialTopPanelHeight);
  const [panelSizes, setPanelSizes] = useState({ topPanelSize: 0, mainSize: 0 });

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
      setTopPanelHeight(percentToPixels(containerHeight, topPanelSize));
    },
    [containerHeight, topPanelId]
  );

  // This effect will update the panel sizes based on the top panel height whenever
  // it or the container height changes. This allows us to keep the height of the
  // top panel panel fixed when the window is resized.
  useEffect(() => {
    if (!containerHeight) {
      return;
    }

    let topPanelSize: number;

    // If the container height is less than the minimum main content height
    // plus the current top panel height, then we need to make some adjustments.
    if (containerHeight < minMainHeight + topPanelHeight) {
      const newTopPanelHeight = containerHeight - minMainHeight;

      // Try to make the top panel height fit within the container, but if it
      // doesn't then just use the minimum height.
      if (newTopPanelHeight < minTopPanelHeight) {
        topPanelSize = pixelsToPercent(containerHeight, minTopPanelHeight);
      } else {
        topPanelSize = pixelsToPercent(containerHeight, newTopPanelHeight);
      }
    } else {
      topPanelSize = pixelsToPercent(containerHeight, topPanelHeight);
    }

    setPanelSizes({ topPanelSize, mainSize: 100 - topPanelSize });
  }, [containerHeight, topPanelHeight, minTopPanelHeight, minMainHeight]);

  return (
    <div
      className="eui-fullHeight"
      onMouseUp={disableResizeWithPortalsHack}
      onMouseLeave={disableResizeWithPortalsHack}
      onTouchEnd={disableResizeWithPortalsHack}
    >
      <EuiResizableContainer
        className={className}
        direction="vertical"
        onPanelWidthChange={onPanelSizeChange}
      >
        {(EuiResizablePanel, EuiResizableButton) => (
          <>
            <EuiResizablePanel
              id={topPanelId}
              minSize={`${minTopPanelHeight}px`}
              size={panelSizes.topPanelSize}
              paddingSize="none"
            >
              {topPanel}
            </EuiResizablePanel>
            <EuiResizableButton css={resizeWithPortalsHackButtonCss}>
              <span
                onMouseDown={enableResizeWithPortalsHack}
                onTouchStart={enableResizeWithPortalsHack}
                css={resizeWithPortalsHackButtonInnerCss}
              />
            </EuiResizableButton>
            <EuiResizablePanel
              minSize={`${minMainHeight}px`}
              size={panelSizes.mainSize}
              paddingSize="none"
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
