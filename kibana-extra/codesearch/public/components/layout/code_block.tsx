/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiCodeBlock } from '@elastic/eui';

interface Props {
  code: string;
  language: string;
}

export class CodeBlock extends React.PureComponent<Props, any> {
  public render() {
    return (
      <EuiCodeBlock language={this.props.language} className="codeBlock">
        {this.props.code}
      </EuiCodeBlock>
    );
  }
}
