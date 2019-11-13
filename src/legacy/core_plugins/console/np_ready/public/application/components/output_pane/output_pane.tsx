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

import React, { useState } from 'react';
import { EuiTabs, EuiTab, EuiFlexGroup, EuiFlexItem, EuiResizeObserver } from '@elastic/eui';
import { OutputPaneVisualisationDescriptor } from './types';
import { ESRequestResult } from '../../hooks/use_send_current_request_to_es/send_request_to_es';

export interface Props {
  data: ESRequestResult[];
  visualisationDescriptors: OutputPaneVisualisationDescriptor[];
  fontSize: number;
}

export const OutputPane = ({ visualisationDescriptors, data, fontSize }: Props) => {
  const [currentVisIdx, setCurrentVisIdx] = useState<number>(-1);
  const [currentHeight, setCurrentHeight] = useState<number>(0);

  const renderVis = () => {
    if (currentVisIdx > -1) {
      const { Component: CurrentVis } = visualisationDescriptors[currentVisIdx];
      return <CurrentVis fontSize={fontSize} containerHeight={currentHeight} data={data} />;
    }
    return null;
  };

  return (
    <EuiResizeObserver onResize={({ height }) => setCurrentHeight(height)}>
      {ref => (
        <EuiFlexGroup
          className="outputPane__visContainer"
          responsive={false}
          gutterSize="none"
          direction="column"
        >
          <EuiFlexItem grow={false}>
            <EuiTabs>
              {visualisationDescriptors.map(({ title, isCompatible }, idx) => {
                const disabled = !isCompatible(data[0]);
                return (
                  <EuiTab
                    isSelected={idx === currentVisIdx}
                    disabled={disabled}
                    key={idx}
                    onClick={() => setCurrentVisIdx(idx)}
                  >
                    {title}
                  </EuiTab>
                );
              })}
            </EuiTabs>
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <div className="outputPane__visContainer__vis" ref={ref}>
              {renderVis()}
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiResizeObserver>
  );
};
