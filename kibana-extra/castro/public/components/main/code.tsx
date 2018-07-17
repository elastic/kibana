/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiButton,
  EuiButton,
  EuiCodeBlock,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiTextArea,
} from '@elastic/eui';
import './code.css';

interface State {
  path: string;
  content: string;
  html?: string;
}

export default class Code extends React.Component<any, State> {
  constructor(props: any) {
    super(props);
    this.state = {
      path: 'HelloWorld.java',
      content: `
             comments  */
             import System.out;
             class HelloWorld {
                public static void main(String[] args){
                    // some comments
                    int x = 5;
                    System.out.println("hello world");
                }
             }
            `,
    };
  }

  public highlight = () => {
    const { httpClient } = this.props;
    httpClient
      .post(`../api/castro/highlight/${this.state.path}`, { content: this.state.content })
      .then(response => {
        this.setState({ html: response.data });
      });
  };

  public onChangePath = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ path: event.target.value });
  };

  public onChangeContent = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({ content: event.target.value });
  };

  public render() {
    return (
      <div>
        <EuiForm>
          <EuiFormRow label="Text field" helpText="Your file name.">
            <EuiFieldText
              name="first"
              placeholder={'HelloWorld.java'}
              value={this.state.path}
              onChange={this.onChangePath}
            />
          </EuiFormRow>
          <EuiFormRow label="Source" fullWidth={true} helpText="Put your source content here">
            <EuiTextArea
              fullWidth={true}
              placeholder="class HelloWorld {}"
              value={this.state.content}
              onChange={this.onChangeContent}
            />
          </EuiFormRow>
          <EuiButton type="submit" size="s" fill={true} onClick={this.highlight}>
            Highlight
          </EuiButton>
        </EuiForm>
        <EuiSpacer size="xl" />
        <EuiPanel paddingSize="l" hasShadow={true}>
          <EuiCodeBlock language="java">{this.state.content}</EuiCodeBlock>
        </EuiPanel>
      </div>
    );
  }
}
