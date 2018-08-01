/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { Repository } from '../../../model/repository';

interface RepoProps {
  httpClient: any;
  repo: Repository;
  deleteRepoSuccessCallBack: (repo: Repository) => any;
}

export class Repo extends React.Component<RepoProps, any> {
  public deleteRepo = () => {
    this.props.httpClient.delete(`../api/cs/repo/${this.props.repo.uri}`).then(() => {
      this.props.deleteRepoSuccessCallBack(this.props.repo);
    });
  };

  public indexRepo = () => {
    this.props.httpClient.post(`../api/cs/repo/index/${this.props.repo.uri}`);
  };

  public render() {
    const { name, uri } = this.props.repo;
    return (
      <EuiFlexGroup className="repoContainer">
        <EuiFlexItem>
          <a href={`#/${uri}/HEAD`}>{name}</a>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={this.indexRepo}>Index</EuiButton>
          <EuiButton onClick={this.deleteRepo}>Delete</EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
