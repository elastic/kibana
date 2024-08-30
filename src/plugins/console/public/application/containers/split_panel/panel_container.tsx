/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Children, ReactNode, useRef, useState, useCallback, useEffect } from 'react';

import { keys, useIsWithinMaxBreakpoint } from '@elastic/eui';
import { Resizer, ResizerMouseEvent, ResizerKeyDownEvent } from './resizer';
import { PanelContextProvider, PanelRegistry } from '../../contexts';

export interface Props {
  children: ReactNode;
  className?: string;
  resizerClassName?: string;
  onPanelSizeChange?: (arrayOfPanelLengths: number[], isVertical: boolean) => void;
}

interface State {
  isDragging: boolean;
  currentResizerPos: number;
}

const pxToPercent = (proportion: number, whole: number) => (proportion / whole) * 100;

export function PanelsContainer({
  children,
  className,
  onPanelSizeChange,
  resizerClassName,
}: Props) {
  const childrenArray = Children.toArray(children);
  const [firstChild, secondChild] = childrenArray;

  const isVerticalLayout = useIsWithinMaxBreakpoint('m');
  const initialState: State = { isDragging: false, currentResizerPos: isVerticalLayout ? 100 : -1 };

  const registryRef = useRef(new PanelRegistry());
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>(initialState);

  const getContainerWidth = () => {
    return containerRef.current!.getBoundingClientRect().width;
  };

  const handleMouseDown = useCallback(
    (event: ResizerMouseEvent) => {
      setState({
        ...state,
        isDragging: true,
        currentResizerPos: event.clientX,
      });
    },
    [state]
  );

  const handleKeyDown = useCallback(
    (ev: ResizerKeyDownEvent) => {
      const { key } = ev;

      if (key === keys.ARROW_LEFT || key === keys.ARROW_RIGHT) {
        ev.preventDefault();

        const { current: registry } = registryRef;
        const [left, right] = registry.getPanels();

        const leftPercent = left.width - (key === keys.ARROW_LEFT ? 1 : -1);
        const rightPercent = right.width - (key === keys.ARROW_RIGHT ? 1 : -1);

        left.setWidth(leftPercent);
        right.setWidth(rightPercent);

        if (onPanelSizeChange) {
          onPanelSizeChange([leftPercent, rightPercent], false);
        }
      }
    },
    [onPanelSizeChange]
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      // For now we only support bi-split
      if (childrenArray.length > 2) {
        // eslint-disable-next-line no-console
        console.warn(
          '[Split Panels Container] Detected more than two children; ignoring additional children.'
        );
      }
    }
  }, [childrenArray.length]);

  const childrenWithResizer = [
    firstChild,
    <Resizer
      key={'resizer'}
      className={resizerClassName}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
      isVertical={isVerticalLayout}
    />,
    secondChild,
  ];

  const onResizerMove = (event) => {
    if (!state.isDragging) {
      return;
    }
    const { current: registry } = registryRef;
    if (isVerticalLayout) {
      const { clientY: y } = event;
      const [up, down] = registry.getPanels();
      const delta = y - state.currentResizerPos;
      const containerHeight = getContainerHeight();
      const upPercent = pxToPercent(up.getHeight() + delta, containerHeight);
      const downPercent = pxToPercent(down.getHeight() - delta, containerHeight);
      up.setHeight(upPercent);
      down.setHeight(downPercent);

      if (onPanelSizeChange) {
        onPanelSizeChange([upPercent, downPercent], true);
      }

      setState({ ...state, currentResizerPos: x });
    } else {
      const { clientX: x } = event;
      const [left, right] = registry.getPanels();
      const delta = x - state.currentResizerPos;
      const containerWidth = getContainerWidth();
      const leftPercent = pxToPercent(left.getWidth() + delta, containerWidth);
      const rightPercent = pxToPercent(right.getWidth() - delta, containerWidth);
      if (leftPercent >= 0.1 && rightPercent >= 0.1) {
        left.setWidth(leftPercent);
        right.setWidth(rightPercent);

        if (onPanelSizeChange) {
          onPanelSizeChange([leftPercent, rightPercent], false);
        }

        setState({ ...state, currentResizerPos: x });
      }
    }
  };

  return (
    <PanelContextProvider registry={registryRef.current}>
      <div
        className={className}
        ref={containerRef}
        style={{
          display: 'flex',
          flexDirection: isVerticalLayout ? 'column' : 'row',
          height: '100%',
          width: '100%',
        }}
        onMouseMove={(event) => onResizerMove(event)}
        onMouseUp={() => {
          setState(initialState);
        }}
      >
        {childrenWithResizer}
      </div>
    </PanelContextProvider>
  );
}
