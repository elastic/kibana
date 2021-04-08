/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';

interface VisualizationNoResultsProps {
  onInit?: () => void;
  error: string;
}

export class VisualizationError extends React.Component<VisualizationNoResultsProps> {
  public render() {
    return (
      <EuiEmptyPrompt
        iconType="alert"
        iconColor="danger"
        data-test-subj="embeddable-lens-failure"
        body={<p>{this.props.error}</p>}
      />
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
