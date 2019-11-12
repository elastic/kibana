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

import React, { useRef, useState } from 'react';
import { EuiTabs, EuiTab, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { OutputPaneVisualisationDescriptor, BaseResponseTypes } from './types';
import { ESRequestResult } from '../../hooks/use_send_current_request_to_es/send_request_to_es';

export interface Props {
  type: BaseResponseTypes | null;
  data: ESRequestResult[] | null;
  visualisationDescriptors: OutputPaneVisualisationDescriptor[];
}

export const OutputPane = ({ visualisationDescriptors, data, type }: Props) => {
  const [currentVis, setCurrentVis] = useState<string | null>(null);
  const containerRef = useRef<HTMLElement>(null as any);

  if (!type) {
    return <p>Empty!</p>;
  }
  const compatibleVisualisations = visualisationDescriptors.filter(vis =>
    vis.isCompatible({ data, type })
  );

  if (!data) {
    return null;
  }

  const renderVis = () => {
    const CurrentVis = currentVis
      ? compatibleVisualisations.find(vis => vis.title === currentVis)!.Component
      : null;

    if (CurrentVis) {
      return data.map((datum, idx) => {
        return <CurrentVis key={idx} data={datum} />;
      });
    }
    return null;
  };

  return (
    <EuiFlexGroup
      ref={containerRef}
      className="outputPane__visContainer"
      responsive={false}
      gutterSize="none"
      direction="column"
    >
      <EuiFlexItem grow={false}>
        <EuiTabs>
          {compatibleVisualisations.map(({ title }) => {
            return (
              <EuiTab key={title} onClick={() => setCurrentVis(title)}>
                {title}
              </EuiTab>
            );
          })}
        </EuiTabs>
      </EuiFlexItem>
      <EuiFlexItem grow={true}>{renderVis()}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
