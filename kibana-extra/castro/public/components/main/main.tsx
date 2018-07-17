/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageHeader,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';

import { Link } from 'react-router-dom';

import { Entry } from '../../../server/routes/example';
import Counter from '../counter';
import Code from './code';

interface MainProps {
  title: string;
  httpClient: any;
}

interface MainState {
  workspace: string;
  entries: Entry[];
}

export class Main extends React.Component<MainProps, MainState> {
  constructor(props: MainProps) {
    super(props);
    this.state = {
      workspace: '',
      entries: [],
    };
  }

  public componentDidMount() {
    /*
           FOR EXAMPLE PURPOSES ONLY.  There are much better ways to
           manage state and update your UI than this.
        */
    const { httpClient } = this.props;
    httpClient.get('../api/castro/example').then((resp: any) => {
      this.setState({ ...resp.data });
    });
  }

  public render() {
    const { title } = this.props;
    return (
      <EuiPage>
        <EuiPageHeader>
          <EuiTitle size="l">
            <h1>Hello {title}!</h1>
          </EuiTitle>
          <EuiButton>
            <Link to="/codebrowsing">browsing code</Link>
          </EuiButton>
        </EuiPageHeader>
        <EuiPageBody>
          <EuiPageContent>
            <EuiPageContentHeader>
              <EuiTitle>
                <h2>{this.state.workspace}</h2>
              </EuiTitle>
            </EuiPageContentHeader>
            <EuiPageContentBody>
              <Counter />
              <EuiSpacer size="xl" />
              <Code httpClient={this.props.httpClient} />
              <EuiSpacer size="xl" />
              <EuiTitle>
                <h2>Files</h2>
              </EuiTitle>
              <EuiSpacer size="xs" />
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}
