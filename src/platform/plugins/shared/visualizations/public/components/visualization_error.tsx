/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import React from 'react';

interface VisualizationErrorProps {
  onInit?: () => void;
  error: string | Error;
}

export class VisualizationError extends React.Component<VisualizationErrorProps> {
  public render() {
    return (
      <EuiEmptyPrompt
        iconType="warning"
        iconColor="danger"
        data-test-subj="visualization-error"
        body={
          <EuiText size="xs" data-test-subj="visualization-error-text">
            {typeof this.props.error === 'string' ? this.props.error : this.props.error.message}
          </EuiText>
        }
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

// eslint-disable-next-line import/no-default-export
export default VisualizationError;
