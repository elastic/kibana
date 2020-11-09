/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Children, ReactNode, useRef, useState, useCallback, useEffect } from 'react';

import { keys } from '@elastic/eui';
import { PanelContextProvider } from '../context';
import { Resizer, ResizerMouseEvent, ResizerKeyDownEvent } from '../components/resizer';
import { PanelRegistry } from '../registry';

export interface Props {
  children: ReactNode;
  className?: string;
  resizerClassName?: string;
  onPanelWidthChange?: (arrayOfPanelWidths: number[]) => any;
}

interface State {
  isDragging: boolean;
  currentResizerPos: number;
}

const initialState: State = { isDragging: false, currentResizerPos: -1 };

const pxToPercent = (proportion: number, whole: number) => (proportion / whole) * 100;

export function PanelsContainer({
  children,
  className,
  onPanelWidthChange,
  resizerClassName,
}: Props) {
  const childrenArray = Children.toArray(children);
  const [firstChild, secondChild] = childrenArray;

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

        if (onPanelWidthChange) {
          onPanelWidthChange([leftPercent, rightPercent]);
        }
      }
    },
    [onPanelWidthChange]
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
    />,
    secondChild,
  ];

  return (
    <PanelContextProvider registry={registryRef.current}>
      <div
        className={className}
        ref={containerRef}
        style={{ display: 'flex', height: '100%', width: '100%' }}
        onMouseMove={(event) => {
          if (state.isDragging) {
            const { clientX: x } = event;
            const { current: registry } = registryRef;
            const [left, right] = registry.getPanels();
            const delta = x - state.currentResizerPos;
            const containerWidth = getContainerWidth();
            const leftPercent = pxToPercent(left.getWidth() + delta, containerWidth);
            const rightPercent = pxToPercent(right.getWidth() - delta, containerWidth);
            left.setWidth(leftPercent);
            right.setWidth(rightPercent);

            if (onPanelWidthChange) {
              onPanelWidthChange([leftPercent, rightPercent]);
            }

            setState({ ...state, currentResizerPos: x });
          }
        }}
        onMouseUp={() => {
          setState(initialState);
        }}
      >
        {childrenWithResizer}
      </div>
    </PanelContextProvider>
  );
}
