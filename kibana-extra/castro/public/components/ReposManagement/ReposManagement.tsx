/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiButton, EuiFieldText } from '@elastic/eui';

import Repo from './Repo';

class ReposManagement extends React.Component {
  public state = {
    repos: [],
    importRepoField: '',
  };

  public componentDidMount() {
    this.fetchRepos();
  }

  public fetchRepos = () => {
    this.props.httpClient.get('../api/castro/repos').then(res => {
      this.setState({ repos: res.data });
    });
  };

  public deleteRepoFromState = repo => {
    this.setState(prevState => ({
      repos: prevState.repos.filter(r => r.url !== repo.url),
    }));
  };

  public handleImportRepoFieldChange = e => {
    this.setState({ importRepoField: e.target.value });
  };

  public importRepo = () => {
    if (this.state.importRepoField) {
      this.props.httpClient
        .post('../api/castro/repo', { url: this.state.importRepoField })
        .then(this.fetchRepos);
    }
  };

  public render() {
    const renderRepo = repo => (
      <Repo
        key={repo.uri}
        repo={repo}
        httpClient={this.props.httpClient}
        deleteRepoSuccessCallBack={this.deleteRepoFromState}
      />
    );

    return (
      <div>
        <div>
          <EuiFieldText
            placeholder="input repo url here"
            value={this.state.importRepoField}
            onChange={this.handleImportRepoFieldChange}
          />
          <EuiButton onClick={this.importRepo}>import</EuiButton>
        </div>
        {this.state.repos.map(renderRepo)}
      </div>
    );
  }
}

export default ReposManagement;
