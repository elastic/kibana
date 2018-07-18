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

class Repo extends React.Component<RepoProps, any> {
  public deleteRepo = () => {
    this.props.httpClient.delete(`../api/castro/repo/${this.props.repo.uri}`).then(() => {
      this.props.deleteRepoSuccessCallBack(this.props.repo);
    });
  };

  public render() {
    const { name } = this.props.repo;
    return (
      <EuiFlexGroup className="repoContainer">
        <EuiFlexItem>
          <div>{name}</div>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={this.deleteRepo}>Delete</EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}

export default Repo;
