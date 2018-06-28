import React from 'react';

import { EuiCodeBlock } from '@elastic/eui';

import './CodeBlock.css'

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
    static defaultProps = {
        code: codeSnippet,
        language: 'js'
    };

    public render() {
        return <EuiCodeBlock language={this.props.language} className="codeBlock">{this.props.code}</EuiCodeBlock>
    }
}
