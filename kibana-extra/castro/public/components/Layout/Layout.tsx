/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeader,
  EuiHeaderLogo,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  EuiHeaderSectionItemButton,
  EuiIcon,
  EuiPage,
} from '@elastic/eui';

import DirectoryTree from './DirectoryTree';
import Editor from './Editor';
interface State {
  children: any[];
  node: any;
  workspace?: string;
}

export default class Layout extends React.Component<any, State> {
  constructor(props) {
    super(props);
    this.state = {
      children: [],
      node: null,
      workspace: '',
    };
  }

  public componentDidMount() {
    fetch('../api/castro/tree')
      .then(resp => resp.json())
      .then((json: any) => {
        this.setState({
          workspace: json.workspace,
          children: json.root.children,
        });
      });
  }

  public onClick = node => {
    this.setState({ node });
  };

  public render() {
    const editor = this.state.node && (
      <Editor
        file={this.state.workspace + '/' + this.state.node.path}
        blob={this.state.node.blob}
      />
    );

    return (
      <EuiPage>
        <EuiHeader>
          <EuiHeaderSection>
            <EuiHeaderSectionItem border="right">
              <EuiHeaderLogo>Code Browsing</EuiHeaderLogo>
            </EuiHeaderSectionItem>
          </EuiHeaderSection>

          <EuiHeaderSection side="right">
            <EuiHeaderSectionItemButton aria-label="Search">
              <EuiIcon type="search" size="m" />
            </EuiHeaderSectionItemButton>
          </EuiHeaderSection>
        </EuiHeader>
        <EuiFlexGroup>
          <EuiFlexItem style={{ maxWidth: 300 }}>
            <DirectoryTree items={this.state.children} onClick={this.onClick} />
          </EuiFlexItem>

          <EuiFlexItem>{editor}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiPage>
    );
  }
}
