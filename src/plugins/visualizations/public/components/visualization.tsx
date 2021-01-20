/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
