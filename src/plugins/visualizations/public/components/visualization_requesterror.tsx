/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EuiIcon, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import { SearchError } from '../../../../plugins/data/public';

interface VisualizationRequestErrorProps {
  onInit?: () => void;
  error: SearchError | string;
}

export class VisualizationRequestError extends React.Component<VisualizationRequestErrorProps> {
  private containerDiv = React.createRef<HTMLDivElement>();

  public render() {
    const { error } = this.props;
    const errorMessage = typeof error === 'string' ? error : error.message;

    return (
      <div className="visError" ref={this.containerDiv}>
        <EuiText size="xs" color="subdued">
          <EuiIcon type="alert" size="m" color="danger" />

          <EuiSpacer size="s" />

          {errorMessage}
        </EuiText>
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
