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

import React, { Children, ReactNode, useRef, useState } from 'react';

import { PanelContextProvider } from '../context';
import { Resizer } from '../components/resizer';
import { PanelRegistry } from '../registry';

export interface Props {
  children: ReactNode;
  onPanelWidthChange?: (arrayOfPanelWidths: number[]) => any;
}

interface State {
  currentPanel: number;
  isDragging: boolean;
  currentResizerPos: number;
}

const initialState = { currentPanel: -1, isDragging: false, currentResizerPos: -1 };

const pxToPercent = (proportion: number, whole: number) => (proportion / whole) * 100;

// TODO: Write tests for this
export function PanelsContainer({ children, onPanelWidthChange }: Props) {
  const [firstChild, ...rest] = Children.toArray(children);

  const registryRef = useRef(new PanelRegistry());
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>(initialState);

  const getContainerWidth = () => {
    return containerRef.current!.getBoundingClientRect().width;
  };

  const childrenWithResizer = rest.reduce(
    (acc: ReactNode[], child, idx) => {
      // The target idx is offset by one, we want to target the panel to the left of the resizer
      // for resizing.
      return acc.concat([
        <Resizer
          key={idx}
          onMouseDown={event => {
            event.preventDefault();
            setState({
              ...state,
              currentPanel: idx,
              isDragging: true,
              currentResizerPos: event.clientX,
            });
          }}
        />,
        child,
      ]);
    },
    [firstChild]
  );

  return (
    <PanelContextProvider registry={registryRef.current}>
      <div
        ref={containerRef}
        style={{ display: 'flex', height: '100%', width: '100%' }}
        onMouseMove={event => {
          if (state.isDragging) {
            const { clientX: x } = event;
            const { current: registry } = registryRef;
            const [left, right] = registry.getResizerNeighbours(state.currentPanel);
            const delta = x - state.currentResizerPos;
            const containerWidth = getContainerWidth();
            const leftPercent = pxToPercent(left.getWidth() + delta, containerWidth);
            const rightPercent = pxToPercent(right.getWidth() - delta, containerWidth);

            left.setWidth(leftPercent);
            right.setWidth(rightPercent);

            if (onPanelWidthChange) {
              onPanelWidthChange(
                registry.getPanels().map(panel => pxToPercent(panel.getWidth(), containerWidth))
              );
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
