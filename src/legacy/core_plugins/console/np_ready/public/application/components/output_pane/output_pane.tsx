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
import { EuiTabs, EuiTab, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { OutputPaneVisualisationDescriptor, BaseResponseTypes } from './types';

export interface Props {
  type: BaseResponseTypes | null;
  data: unknown | null;
  visualisationDescriptors: OutputPaneVisualisationDescriptor[];
}

export const OutputPane = ({ visualisationDescriptors, data, type }: Props) => {
  const [currentVis, setCurrentVis] = useState<string | null>(null);

  if (!type) {
    return <p>Empty!</p>;
  }
  const compatibleVisualisations = visualisationDescriptors.filter(vis =>
    vis.isCompatible({ data, type })
  );
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiTabs>
          {compatibleVisualisations.map(({ title }) => {
            return <EuiTab onClick={() => setCurrentVis(title)}>{title}</EuiTab>;
          })}
        </EuiTabs>
      </EuiFlexItem>
      <EuiFlexItem>
        {currentVis
          ? compatibleVisualisations.find(vis => vis.title === currentVis)!.Component
          : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
