/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DetailSymbolInformation } from '@code/lsp-extension';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import moment from 'moment';
import React from 'react';
import Markdown from 'react-markdown';
import { connect } from 'react-redux';

import { parse as parseQuery } from 'query-string';
import { Link, match, withRouter } from 'react-router-dom';
import { QueryString } from 'ui/utils/query_string';
import { Location } from 'vscode-languageserver';
import { GitBlame } from '../../../common/git_blame';
import { RepositoryUtils } from '../../../common/repository_utils';
import { CloneProgress, FileTree as Tree, FileTreeItemType } from '../../../model';
import {
  closeTreePath,
  FetchFileResponse,
  fetchRepoTree,
  FetchRepoTreePayload,
} from '../../actions';
import { RootState } from '../../reducers';
import { history } from '../../utils/url';
import { Editor } from '../editor/editor';
import { FileTree } from '../file_tree/file_tree';
import { NotFound } from './not_found';

import { AutocompleteSuggestion, QueryBar, SymbolSuggestionsProvider } from '../query_bar';
import { PathTypes } from '../routes';
import { SymbolTree } from '../symbol_tree/symbol_tree';
import { CloneStatus } from './clone_status';
import { LayoutBreadcrumbs } from './layout_breadcrumbs';

import 'github-markdown-css/github-markdown.css';
import { GitBlame } from '../../../common/git_blame';
import { SearchScope } from '../../common/constants';
import { cloneProgressSelector, progressSelector, treeCommitsSelector } from '../../selectors';
import { AlignCenterContainer } from '../../styled_components/align_center_container';
import { Blame } from './blame';
import { CommitMessages } from './commit_messages';

enum Tabs {
  FILE_TREE = 'file-tree',
  STRUCTURE_TREE = 'structure-tree',
}

enum SearchTabs {
  settings,
  box,
}

const noMarginStyle = {
  margin: 0,
};

interface State {
  showSearchBox: boolean;
  tab: Tabs;
  searchTab: SearchTabs;
  searchScope: SearchScope;
  showBlame: boolean;
}

interface Props {
  match: match<{ [key: string]: string }>;
  tree: FileTree;
  openedPaths: string[];
  fetchRepoTree: (payload: FetchRepoTreePayload) => void;
  closeTreePath: (path: string) => void;
  repositorySearchResults: any;
  isNotFound: boolean;
  file: FetchFileResponse;
  progress?: number;
  cloneProgress?: CloneProgress;
  blames: GitBlame[];
}

const DirectoryView = withRouter(props => {
  const files = props.node ? props.node.children : null;
  const { resource, org, repo, revision } = props.match.params;
  const fileList =
    files &&
    files.map(file => {
      if (file.type === FileTreeItemType.File) {
        return (
          <div key={file.name} className="directoryItem">
            <Link to={`/${resource}/${org}/${repo}/${PathTypes.blob}/${revision}/${file.path}`}>
              {file.name}
            </Link>
          </div>
        );
      } else if (file.type === FileTreeItemType.Directory) {
        return (
          <div key={file.name} className="directoryItem">
            <Link to={`/${resource}/${org}/${repo}/${PathTypes.tree}/${revision}/${file.path}`}>
              {file.name}/
            </Link>
          </div>
        );
      } else {
        throw new Error(`invalid file tree item type ${file.type}`);
      }
    });
  return <div className="directoryView">{fileList}</div>;
});

const Commits = props => {
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
      <Link to={`/commit/${props.repoId}/${commit.id}`}>{commit.id}</Link> {commit.message}{' '}
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

export class LayoutPage extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      showSearchBox: false,
      tab: parseQuery(props.location.search).tab,
      searchTab: SearchTabs.box,
      searchScope: SearchScope.default,
      showBlame: false,
    };
  }

  public showBlame = () => {
    this.setState({ showBlame: true });
  };

  public hideBlame = () => {
    this.setState({ showBlame: false });
  };

  public onClick = (node: Tree) => {
    const { resource, org, repo, revision } = this.props.match.params;
    const pathType = node.type === FileTreeItemType.File ? 'blob' : 'tree';
    history.push(`/${resource}/${org}/${repo}/${pathType}/${revision}/${node.path}`);
  };

  public findNode = (pathSegments: string[], node: Tree) => {
    if (!node) {
      return null;
    } else if (pathSegments.length === 0) {
      return node;
    } else if (pathSegments.length === 1) {
      return (node.children || []).find(n => n.name === pathSegments[0]);
    } else {
      const currentFolder = pathSegments.shift();
      return this.findNode(pathSegments, (node.children || []).find(n => n.name === currentFolder));
    }
  };

  public getTreeToggler = (path: string) => () => {
    if (this.props.openedPaths.includes(path)) {
      this.props.closeTreePath(path);
    } else {
      this.fetchTree(path);
    }
  };

  public getSymbolLinkUrl = (loc: Location) => {
    return RepositoryUtils.locationToUrl(loc);
  };

  public toggleSearchBox = () => {
    this.setState({ showSearchBox: !this.state.showSearchBox });
  };

  public onChange = (selectedOptions: any[]) => {
    const { symbol } = selectedOptions[0];
    const location = symbol.symbolInformation.location;
    const url = this.getSymbolLinkUrl(location);
    history.push(url);
  };

  public onSelectedTabChanged = (tab: Tabs) => {
    this.setState({ tab });
    const { pathname, search } = history.location;
    history.push(QueryString.replaceParamInUrl(`${pathname}${search}`, 'tab', tab));
  };

  public renderTabs = () => {
    const clickFileTreeHandler = () => this.onSelectedTabChanged(Tabs.FILE_TREE);
    const clickStructureTreeHandler = () => this.onSelectedTabChanged(Tabs.STRUCTURE_TREE);
    return (
      <React.Fragment>
        <EuiTab onClick={clickFileTreeHandler} isSelected={Tabs.FILE_TREE === this.state.tab}>
          File Tree
        </EuiTab>
        <EuiTab
          onClick={clickStructureTreeHandler}
          isSelected={Tabs.STRUCTURE_TREE === this.state.tab}
          disabled={this.props.match.params.pathType === PathTypes.tree}
        >
          Structure Tree
        </EuiTab>
      </React.Fragment>
    );
  };

  public renderTabContent = () =>
    this.state.tab === Tabs.STRUCTURE_TREE ? (
      <SymbolTree />
    ) : (
      <FileTree
        node={this.props.tree}
        onClick={this.onClick}
        openedPaths={this.props.openedPaths}
        getTreeToggler={this.getTreeToggler}
        activePath={this.props.match.params.path || ''}
      />
    );

  public scrollBlameInResponseOfScrollingEditor = ele => {
    const observer = new MutationObserver(records => {
      if (!ele) {
        observer.disconnect();
        return;
      }
      ele.scrollTop = -parseInt(records[records.length - 1].target.style.top, 10);
    });
    const targetNode = document.querySelector('#mainEditor:first-child:first-child:first-child');
    observer.observe(targetNode, {
      attributes: true,
      childList: true,
      subtree: true,
    });
  };

  public renderContent = () => {
    const { path, pathType, resource, org, repo } = this.props.match.params;
    const repoId = `${resource}/${org}/${repo}`;
    if (pathType === PathTypes.tree) {
      return (
        <EuiFlexGroup direction="column" style={noMarginStyle}>
          <EuiFlexItem className="contentItem">
            <DirectoryView node={this.findNode(path ? path.split('/') : [], this.props.tree)} />
          </EuiFlexItem>
          <EuiFlexItem className="contentItem">
            <Commits commits={this.props.commits} repoId={repoId} />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    } else if (this.props.match.params.pathType === PathTypes.blob) {
      const { file } = this.props;
      if (!file) {
        return null;
      }
      const { lang: fileLanguage, content: fileContent, url } = file;
      if (fileLanguage === 'markdown') {
        return (
          <div className="markdown-body markdownContainer">
            <Markdown source={fileContent} escapeHtml={true} skipHtml={true} />
          </div>
        );
      } else if (this.props.file.isImage) {
        return (
          <div className="autoMargin">
            <img src={url} alt={path} />
          </div>
        );
      }
      const blame = this.state.showBlame && (
        <div className="blameContainer" ref={this.scrollBlameInResponseOfScrollingEditor}>
          <Blame blames={this.props.blames} lineHeight={18} />
        </div>
      );
      return (
        <div className="editorBlameContainer">
          {blame}
          <Editor />
        </div>
      );
    } else {
      return null;
    }
  };

  public showSearchSettings = () => {
    this.setState({ searchTab: SearchTabs.settings });
  };

  public showSearchBox = () => {
    this.setState({ searchTab: SearchTabs.box });
  };

  public setSearchScope = (scope: SearchScope) => () => {
    this.setState({ searchScope: scope });
  };

  public getComboBoxOptions = () => {
    if (this.state.searchScope === SearchScope.symbol) {
      return this.props.symbols.map((symbol: DetailSymbolInformation) => {
        return {
          label: symbol.qname,
          symbol,
        };
      });
    } else if (this.state.searchScope === SearchScope.repository) {
      return this.props.repositorySearchResults
        ? this.props.repositorySearchResults.map(r => ({
            label: r.repository.name,
          }))
        : [];
    } else {
      return [];
    }
  };

  public render() {
    const { progress, isNotFound, cloneProgress } = this.props;
    if (isNotFound) {
      return <NotFound />;
    }

    const searchSettings = (
      <div className="searchSettings">
        <EuiFlexGroup>
          <EuiFlexItem className="searchTypeTitle">Search Type</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIcon type="sortUp" onClick={this.showSearchBox} className="collapseButton" />
          </EuiFlexItem>
        </EuiFlexGroup>
        <div className="searchSettingButtons">
          <EuiButton onClick={this.setSearchScope(SearchScope.default)}>Default</EuiButton>
          <EuiButton onClick={this.setSearchScope(SearchScope.symbol)}>Symbol</EuiButton>
          <EuiButton onClick={this.setSearchScope(SearchScope.repository)}>Repository</EuiButton>
        </div>
      </div>
    );

    const onSubmit = (query: string) => {
      if (query.trim().length === 0) {
        return;
      }
      if (this.state.searchScope === SearchScope.repository) {
        history.push(`/search?q=${query}&scope=${SearchScope.repository}`);
      } else {
        history.push(`/search?q=${query}`);
      }
    };

    const onSelect = (item: AutocompleteSuggestion) => {
      history.push(item.selectUrl);
    };

    const searchBox = (
      <EuiFlexGroup
        justifyContent="spaceBetween"
        className="topBar"
        direction="column"
        style={noMarginStyle}
      >
        <EuiFlexItem>
          <QueryBar
            query=""
            onSubmit={onSubmit}
            onSelect={onSelect}
            appName="code"
            suggestionsProvider={new SymbolSuggestionsProvider()}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );

    const searchTabContent = {
      [SearchTabs.box]: searchBox,
      [SearchTabs.settings]: searchSettings,
    };

    const search = (
      <EuiFlexItem grow={false} style={noMarginStyle}>
        <div className="reverseRow">
          <div className="searchSettingButtons">
            <EuiButton>Save</EuiButton>
            <EuiButton>Open</EuiButton>
            <EuiButton onClick={this.showSearchSettings}>Settings</EuiButton>
          </div>
          <div />
        </div>
        {searchTabContent[this.state.searchTab]}
      </EuiFlexItem>
    );

    if (this.shouldRenderProgress(progress, cloneProgress)) {
      return (
        <EuiFlexGroup direction="column" className="mainRoot" style={noMarginStyle}>
          {this.state.showSearchBox && search}
          <EuiFlexItem grow={false} style={noMarginStyle}>
            <EuiFlexGroup justifyContent="spaceBetween" className="topBar" style={noMarginStyle}>
              <EuiFlexItem grow={false} style={noMarginStyle}>
                <LayoutBreadcrumbs routeParams={this.props.match.params} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <div>
                  <EuiButtonIcon iconType="node" aria-label="node" />
                  <EuiButtonIcon iconType="gear" aria-label="config" />
                  <EuiButtonIcon
                    iconType="search"
                    aria-label="Toggle Search Box"
                    onClick={this.toggleSearchBox}
                  />
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiSpacer size="xs" className="spacer" />
          <EuiFlexItem className="codeMainContainer" style={noMarginStyle}>
            <AlignCenterContainer>
              <div>
                <CloneStatus progress={progress} cloneProgress={cloneProgress} />
              </div>
            </AlignCenterContainer>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    return (
      <EuiFlexGroup direction="column" className="mainRoot" style={noMarginStyle}>
        {this.state.showSearchBox && search}
        <EuiFlexItem grow={false} style={noMarginStyle}>
          <EuiFlexGroup justifyContent="spaceBetween" className="topBar" style={noMarginStyle}>
            <EuiFlexItem grow={false} style={noMarginStyle}>
              <LayoutBreadcrumbs routeParams={this.props.match.params} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <div>
                <EuiButtonIcon iconType="node" aria-label="node" />
                <EuiButtonIcon iconType="gear" aria-label="config" />
                <EuiButtonIcon
                  iconType="search"
                  aria-label="Toggle Search Box"
                  onClick={this.toggleSearchBox}
                />
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiSpacer size="xs" className="spacer" />
        <div>
          <EuiButton onClick={this.hideBlame}>RAW</EuiButton>
          <EuiButton onClick={this.showBlame}>BLAME</EuiButton>
          <EuiButton onClick={this.hideBlame}>HISTORY</EuiButton>
        </div>
        <EuiFlexItem className="codeMainContainer" style={noMarginStyle}>
          <EuiFlexGroup justifyContent="spaceBetween" className="codeMain">
            <EuiFlexItem grow={false} style={noMarginStyle} className="fileTreeContainer">
              <div>
                <EuiTabs>{this.renderTabs()}</EuiTabs>
              </div>
              {this.renderTabContent()}
            </EuiFlexItem>
            <EuiFlexItem style={noMarginStyle} className="autoOverflow">
              {this.renderContent()}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  private fetchTree(path = '') {
    const { resource, org, repo, revision } = this.props.match.params;
    this.props.fetchRepoTree({
      uri: `${resource}/${org}/${repo}`,
      revision,
      path: path || '',
    });
  }

  private shouldRenderProgress(progress?: number | null, cloneProgress?: CloneProgress | null) {
    return !!progress && progress < 100 && !RepositoryUtils.hasFullyCloned(cloneProgress);
  }
}

const mapStateToProps = (state: RootState) => ({
  tree: state.file.tree,
  openedPaths: state.file.openedPaths,
  loading: state.file.loading,
  isNotFound: state.file.isNotFound,
  commits: treeCommitsSelector(state),
  file: state.file.file,
  progress: progressSelector(state),
  cloneProgress: cloneProgressSelector(state),
  repositorySearchResults: state.repositorySearch.repositories.repositories,
  blames: state.blame.blames,
});

const mapDispatchToProps = {
  fetchRepoTree,
  closeTreePath,
};

export const Layout = connect(
  mapStateToProps,
  mapDispatchToProps
)(LayoutPage);
