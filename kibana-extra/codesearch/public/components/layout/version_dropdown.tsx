/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiBadge, EuiLink, EuiPopover, EuiSpacer, EuiTabbedContent } from '@elastic/eui';
import React, { Fragment } from 'react';
import { connect } from 'react-redux';
import { CommitInfo, ReferenceInfo } from '../../../model/commit';
import {
  fetchRepoBranches,
  fetchRepoCommits,
  FetchRepoPayload,
  FetchRepoPayloadWithRevision,
} from '../../actions';
import { RootState } from '../../reducers';

interface Props {
  repoUri: string;
  head: string;
  path: string;
  pathType: string;
  branches: ReferenceInfo[];
  tags: ReferenceInfo[];
  commits: CommitInfo[];
  fetchRepoBranches(payload: FetchRepoPayload): void;
  fetchRepoCommits(payload: FetchRepoPayloadWithRevision): void;
}

interface State {
  isOpen: boolean;
}

export class VersionDropDownComponent extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      isOpen: false,
    };
  }

  public onClick = (e: Event) => {
    this.setState({ isOpen: true });
    e.preventDefault();
  };

  public close = () => {
    this.setState({ isOpen: false });
  };

  public componentDidMount() {
    this.props.fetchRepoBranches({ uri: this.props.repoUri });
    this.props.fetchRepoCommits({ uri: this.props.repoUri, revision: this.props.head });
  }

  public componentWillReceiveProps(nextProps: Readonly<Props>): void {
    if (nextProps.repoUri !== this.props.repoUri) {
      this.props.fetchRepoBranches({ uri: nextProps.repoUri });
      this.props.fetchRepoCommits({ uri: nextProps.repoUri, revision: nextProps.head });
    } else if (nextProps.head !== this.props.head) {
      this.props.fetchRepoCommits({ uri: nextProps.repoUri, revision: nextProps.head });
    }
  }

  public renderReference(ref: ReferenceInfo) {
    const { repoUri, path, pathType } = this.props;
    const url = `#/${repoUri}/${pathType}/${ref.commit.id}/${path}`;
    return (
      <div key={ref.commit.id}>
        <EuiLink href={url}>
          <EuiBadge color={'primary'}>{ref.name}</EuiBadge>
          <span>{`${ref.commit.committer} update ${ref.commit.updated}`}</span>
        </EuiLink>
        <EuiSpacer size="xs" />
      </div>
    );
  }

  public renderCommit(commit: CommitInfo) {
    const { repoUri, path, pathType } = this.props;
    const url = `#/${repoUri}/${pathType}/${commit.id}/${path}`;
    return (
      <div key={commit.id}>
        <EuiLink href={url}>
          <EuiBadge color={'primary'}>{commit.id}</EuiBadge>
          <span>{`${commit.message}`}</span>
        </EuiLink>
        <EuiSpacer size="xs" />
      </div>
    );
  }

  public render() {
    const tabs = [
      {
        id: 'branches',
        name: 'Branch',
        content: <Fragment>{this.props.branches.map(br => this.renderReference(br))}</Fragment>,
      },
      {
        id: 'tags',
        name: 'Tag',
        content: <Fragment>{this.props.tags.map(t => this.renderReference(t))}</Fragment>,
      },
      {
        id: 'commits',
        name: 'Commit',
        content: <Fragment>{this.props.commits.map(c => this.renderCommit(c))}</Fragment>,
      },
    ];
    const button = (
      <EuiLink color="subdued" href={''} onClick={this.onClick} title={this.props.head}>
        {this.props.head}
      </EuiLink>
    );
    return (
      <EuiPopover
        id="trapFocus"
        ownFocus={true}
        button={button}
        isOpen={this.state.isOpen}
        closePopover={this.close}
      >
        <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[2]} />
      </EuiPopover>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  commits: state.file.commits,
  branches: state.file.branches,
  tags: state.file.tags,
});

const mapDispatchToProps = {
  fetchRepoCommits,
  fetchRepoBranches,
};

export const VersionDropDown = connect(
  mapStateToProps,
  mapDispatchToProps
)(VersionDropDownComponent);
