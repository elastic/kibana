import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton
} from '@elastic/eui';

import './Repo.css';

import { Repository } from '../../../model/repository';

interface RepoProps {
  httpClient: any;
  repo: Repository;
  deleteRepoSuccessCallBack: (repo: Repository) => any;
}

class Repo extends React.Component<RepoProps, any> {
  deleteRepo = () => {
    this.props.httpClient.delete(`../api/castro/repo/${this.props.repo.uri}`).then(() => {
      this.props.deleteRepoSuccessCallBack(this.props.repo);
    });
  };

  render() {
    const { name } = this.props.repo;
    return <EuiFlexGroup className="repoContainer">
      <EuiFlexItem><div>{name}</div></EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton onClick={this.deleteRepo}>Delete</EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  }
}

export default Repo;
