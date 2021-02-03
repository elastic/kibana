/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EuiIcon, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface VisualizationNoResultsProps {
  onInit?: () => void;
}

export class VisualizationNoResults extends React.Component<VisualizationNoResultsProps> {
  private containerDiv = React.createRef<HTMLDivElement>();

  public render() {
    return (
      <div data-test-subj="visNoResult" className="visError" ref={this.containerDiv}>
        <div className="item top" />
        <div className="item">
          <EuiText size="xs" color="subdued">
            <EuiIcon type="visualizeApp" size="m" color="subdued" />

            <EuiSpacer size="s" />

            <p>
              {i18n.translate('visualizations.noResultsFoundTitle', {
                defaultMessage: 'No results found',
              })}
            </p>
          </EuiText>
        </div>
        <div className="item bottom" />
      </div>
    );
  }

  public componentDidMount() {
    this.afterRender();
  }

  public componentDidUpdate() {
    this.afterRender();
  }

  private afterRender() {
    if (this.props.onInit) {
      this.props.onInit();
    }
  }
}
