/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiResizableContainer,
  useGeneratedHtmlId,
  useResizeObserver,
  mathWithUnits,
  UseEuiTheme,
} from '@elastic/eui';
import type { ResizeTrigger } from '@elastic/eui/src/components/resizable_container/types';
import { css } from '@emotion/react';
import { isEqual, round } from 'lodash';
import type { ReactNode } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { ResizableLayoutDirection } from '../types';
import { getContainerSize, percentToPixels, pixelsToPercent } from './utils';

export const PanelsResizable = ({
  className,
  direction,
  // container,
  fixedPanelSize,
  minFixedPanelSize,
  minFlexPanelSize,
  // panelSizes,
  fixedPanel,
  flexPanel,
  resizeButtonClassName,
  ['data-test-subj']: dataTestSubj = 'resizableLayout',
  onFixedPanelSizeChange,
}: // setPanelSizes,
{
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
  fixedPanel: ReactNode;
  flexPanel: ReactNode;
  resizeButtonClassName?: string;
  ['data-test-subj']?: string;
  onFixedPanelSizeChange?: (fixedPanelSize: number) => void;
  setPanelSizes: (panelSizes: { fixedPanelSizePct: number; flexPanelSizePct: number }) => void;
}) => {
  const fixedPanelId = useGeneratedHtmlId({ prefix: 'fixedPanel' });
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const { height: containerHeight, width: containerWidth } = useResizeObserver(container);
  const containerSize = getContainerSize(direction, containerWidth, containerHeight);
  const [panelSizes, setPanelSizes] = useState({ fixedPanelSizePct: 50, flexPanelSizePct: 50 });

  // The resize overlay makes it so that other mouse events (e.g. tooltip hovers, etc)
  // don't occur when mouse dragging
  const [isResizing, setIsResizing] = useState(false);

  // Align the resizable button border to overlap exactly over existing panel/layout borders
  const buttonStyles = useMemoCss(buttonBorderStyles);

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

  const onResizeStart = useCallback((trigger: ResizeTrigger) => {
    if (trigger !== 'pointer') {
      return;
    }

    setIsResizing(true);
  }, []);

  const onResizeEnd = useCallback(() => {
    if (!isResizing) {
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

    setIsResizing(false);
  }, [isResizing]);

  return (
    <div ref={setContainer} css={containerCss}>
      <EuiResizableContainer
        className={className}
        direction={direction}
        onPanelWidthChange={onPanelSizeChange}
        onResizeStart={onResizeStart}
        onResizeEnd={onResizeEnd}
        data-test-subj={`${dataTestSubj}ResizableContainer`}
        css={containerCss}
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
              indicator="border"
              css={[
                direction === 'horizontal' ? buttonStyles.horizontal : buttonStyles.vertical,
                isResizing ? resizingButtonCss : defaultButtonCss,
              ]}
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
            {isResizing ? <div css={resizingOverlayCss} /> : <></>}
          </>
        )}
      </EuiResizableContainer>
    </div>
  );
};

const containerCss = css`
  position: relative;
  width: 100%;
  height: 100%;
`;
const defaultButtonCss = css`
  z-index: 3;
`;
const resizingButtonCss = css`
  z-index: 4;
`;
const resizingOverlayCss = css`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 3;
`;

const getButtonBorderCss =
  (insetValue: string) =>
  ({ euiTheme }: UseEuiTheme) =>
    css`
    position: relative;
    inset-${insetValue}: -${mathWithUnits(euiTheme.border.width.thin, (x) => x / 2)};
    `;

const buttonBorderStyles = {
  horizontal: getButtonBorderCss('inline-start'),
  vertical: getButtonBorderCss('block-end'),
};
