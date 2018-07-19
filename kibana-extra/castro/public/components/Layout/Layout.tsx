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
  EuiPageBody,
} from '@elastic/eui';
import { match } from 'react-router-dom';

import DirectoryTree from './DirectoryTree';
import Editor from './Editor';
interface State {
  children: any[];
}
interface Props {
  match: match<{ [key: string]: string }>;
}

export default class Layout extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      children: [],
    };
  }

  public componentDidMount() {
    const { resource, org, repo } = this.props.match.params;
    fetch(`../api/castro/repo/${resource}/${org}/${repo}/tree/head`)
      .then(resp => resp.json())
      .then((json: any) => {
        this.setState({
          children: json.children,
        });
      });
  }

  public onClick = (node: any) => {
    const { resource, org, repo } = this.props.match.params;
    window.location.hash = `${resource}/${org}/${repo}/${node.path}`;
  };

  public render() {
    const { resource, org, repo, path } = this.props.match.params;
    const editor = path && <Editor file={path} repoUri={`${resource}/${org}/${repo}`} />;

    return (
      <EuiPage>
        <EuiPageBody>
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
        </EuiPageBody>
      </EuiPage>
    );
  }
}
