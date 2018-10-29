/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { CommitDiff } from '../../../common/git_diff';
import { DiffEditor } from './diff_editor';

interface Props {
  commit: CommitDiff;
}

const Container = styled.div`
  padding: 2rem;
`;

const Header = styled.div`
  padding: 12px;
  border: 1px solid;
  h3 {
    font-size: 15px;
    font-weight: bold;
  }
  p {
    line-height: 1.4;
    color: gray;
    font-weight: 500;
  }
`;

const B = styled.b`
  font-weight: bold;
`;

const Flex = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding: 4px 0 4px 13px;
  line-height: 20px;
`;

export enum DiffLayout {
  Unified,
  Split,
}

const GreenSquare = styled.span`
  display: inline-box;
  height: 10px;
  width: 10px;
  background-color: green;
  border: 1px solid black;
`;

const RedSquare = styled.span`
  display: inline-box;
  height: 10px;
  width: 10px;
  background-color: red;
  border: 1px solid black;
`;

const Modification = props => {
  const greenSquaresCount = Math.min(
    parseInt((props.additions * 6) / (props.deletions + props.additions), 10),
    6
  );
  const redSquaresCount = 6 - greenSquaresCount;
  const additionSquares = Array(greenSquaresCount)
    .fill(1)
    .map((n, index) => {
      return <GreenSquare key={index} />;
    });
  const deletionSquares = Array(redSquaresCount)
    .fill(1)
    .map((n, index) => {
      return <RedSquare key={index + redSquaresCount} />;
    });
  const squares = [...additionSquares, ...deletionSquares];
  return <span>{squares}</span>;
};

export class DiffPage extends React.Component<Props> {
  public state = {
    diffLayout: DiffLayout.Split,
  };

  public setLayoutUnified = () => {
    this.setState({ diffLayout: DiffLayout.Unified });
  };

  public setLayoutSplit = () => {
    this.setState({ diffLayout: DiffLayout.Split });
  };

  public render() {
    const { commit } = this.props;
    if (!commit) {
      return null;
    }
    const diffs = commit.files.map((file, index) => (
      <div>
        <div>
          {file.additions + file.deletions}{' '}
          <Modification additions={file.additions} deletions={file.deletions} />{' '}
          <span>{file.path}</span>
        </div>
        <DiffEditor
          key={file.path}
          originCode={file.originCode}
          modifiedCode={file.modifiedCode}
          language={file.language}
          renderSideBySide={this.state.diffLayout === DiffLayout.Split}
        />
      </div>
    ));
    return (
      <Container>
        <Header>
          <h3>{commit.commit.message}</h3>
        </Header>
        <Header>
          <p>
            {commit.commit.author} committed on {commit.commit.date}
          </p>
          <p>
            commit <span>{commit.commit.sha}</span>
          </p>
        </Header>
        <Flex>
          <div>
            showing {commit.files.length} files with <B>{commit.additions} additions</B> and{' '}
            <B>{commit.deletions} deletions</B>
          </div>
          <EuiFlexItem>
            <div>
              <EuiButton className="diffLayoutButton" onClick={this.setLayoutUnified}>
                Unified
              </EuiButton>
              <EuiButton className="diffLayoutButton" onClick={this.setLayoutSplit}>
                Split
              </EuiButton>
            </div>
          </EuiFlexItem>
        </Flex>
        {diffs}
      </Container>
    );
  }
}

const mapStateToProps = state => ({
  commit: state.commit.commit,
});

export const Diff = connect(mapStateToProps)(DiffPage);
