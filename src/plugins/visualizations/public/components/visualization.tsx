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

import { get } from 'lodash';
import React from 'react';
import { PersistedState } from '../../../../plugins/visualizations/public';
import { memoizeLast } from '../legacy/memoize';
import { VisualizationChart } from './visualization_chart';
import { VisualizationNoResults } from './visualization_noresults';
import { ExprVis } from '../expressions/vis';

function shouldShowNoResultsMessage(vis: ExprVis, visData: any): boolean {
  const requiresSearch = get(vis, 'type.requiresSearch');
  const rows: object[] | undefined = get(visData, 'rows');
  const isZeroHits = get(visData, 'hits') === 0 || (rows && !rows.length);
  const shouldShowMessage = !get(vis, 'type.useCustomNoDataScreen');

  return Boolean(requiresSearch && isZeroHits && shouldShowMessage);
}

interface VisualizationProps {
  listenOnChange: boolean;
  onInit?: () => void;
  uiState: PersistedState;
  vis: ExprVis;
  visData: any;
  visParams: any;
}

export class Visualization extends React.Component<VisualizationProps> {
  private showNoResultsMessage = memoizeLast(shouldShowNoResultsMessage);

  constructor(props: VisualizationProps) {
    super(props);

    props.vis.setUiState(props.uiState);
  }

  public render() {
    const { vis, visData, visParams, onInit, uiState, listenOnChange } = this.props;

    const noResults = this.showNoResultsMessage(vis, visData);

    return (
      <div className="visualization">
        {noResults ? (
          <VisualizationNoResults onInit={onInit} />
        ) : (
          <VisualizationChart
            vis={vis}
            visData={visData}
            visParams={visParams}
            onInit={onInit}
            uiState={uiState}
            listenOnChange={listenOnChange}
          />
        )}
      </div>
    );
  }

  public shouldComponentUpdate(nextProps: VisualizationProps): boolean {
    if (nextProps.uiState !== this.props.uiState) {
      throw new Error('Changing uiState on <Visualization/> is not supported!');
    }
    return true;
  }
}
