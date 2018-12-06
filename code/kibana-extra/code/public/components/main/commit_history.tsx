/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { CommitInfo } from '../../../model/commit';

const CommitMessages = styled.div`
  overflow: auto;
  flex: 1;
`;

interface Props {
  commits: CommitInfo[];
  repoUri: string;
}

export const CommitHistory = (props: Props) => {
  if (!props.commits) {
    return (
      <CommitMessages>
        <h1 className="commitsHeader">Commits</h1>
        <h3>loading</h3>
      </CommitMessages>
    );
  }
  const commitList = props.commits.map(commit => (
    <div key={commit.id} className="commitItem">
      <Link to={`/commit/${props.repoUri}/${commit.id}`}>{commit.id}</Link> {commit.message}{' '}
      {moment(commit.updated).fromNow()}
    </div>
  ));
  return (
    <CommitMessages>
      <h1 className="commitsHeader">Commits</h1>
      {commitList}
    </CommitMessages>
  );
};
