/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiCodeBlock } from '@elastic/eui';

const codeSnippet = `var y = function(le) {
	return function(f) {
		return f(f);
	}(function(f) {
		return le(
			function(x) { return (f(f))(x); }
		);
	});
};`;

export default class CodeBlock extends React.PureComponent {
  public static defaultProps = {
    code: codeSnippet,
    language: 'js',
  };

  public render() {
    return (
      <EuiCodeBlock language={this.props.language} className="codeBlock">
        {this.props.code}
      </EuiCodeBlock>
    );
  }
}
