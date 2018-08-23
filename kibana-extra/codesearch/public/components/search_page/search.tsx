/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSearchBar, EuiSpacer } from '@elastic/eui';
import { IRange } from 'monaco-editor';
import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';

import { RepositoryUtils } from '../../../common/repository_utils';
import { DocumentSearchResult } from '../../../model';
import { documentSearch } from '../../actions';
import { RootState } from '../../reducers';
import { history } from '../../utils/url';
import { CodeBlock } from '../codeblock/codeblock';

interface Props {
  query: string;
  isLoading: boolean;
  error?: Error;
  searchResult?: DocumentSearchResult;
  documentSearch: (q: string) => void;
}

interface State {
  uri: string;
}

class SearchPage extends React.PureComponent<Props, State> {
  public state = {
    uri: '',
  };

  public onSearchChanged = ({ query }) => {
    this.props.documentSearch(query.text);
    // Update the url and push to history as well.
    history.push(`/search?q=${query.text}`);
  };

  public render() {
    const { query, searchResult } = this.props;

    if (searchResult) {
      const { stats, result } = searchResult!;
      const { total, from, to, repoStats, languageStats } = stats;

      const repoStatsComp = repoStats.map((item, index) => {
        return (
          <div key={`repostats${index}`}>
            {item.name} {item.value}
          </div>
        );
      });

      const langStatsComp = languageStats.map((item, index) => {
        return (
          <div key={`langstats${index}`}>
            {item.name} {item.value}
          </div>
        );
      });

      const statsComp = (
        <div>
          <p>
            Showing {from} - {to} of {total} results.
          </p>
          <EuiSpacer />
        </div>
      );

      const resultComp = result.map((item, index) => {
        const highlightRanges = item.highlights.map(h => {
          const range: IRange = {
            startLineNumber: h.range.startLoc.line + 1,
            startColumn: h.range.startLoc.column + 1,
            endLineNumber: h.range.endLoc.line + 1,
            endColumn: h.range.endLoc.column + 1,
          };
          return range;
        });
        const repoLinkUrl = `/${item.uri}/tree/HEAD/`;
        const fileLinkUrl = `/${item.uri}/blob/HEAD/${item.filePath}`;
        return (
          <div key={`resultitem${index}`}>
            <p>
              <Link to={repoLinkUrl}>
                <strong>{RepositoryUtils.repoFullNameFromUri(item.uri)}</strong>
              </Link>
            </p>
            <p>
              &nbsp;&nbsp;&nbsp;&nbsp;
              {item.hits} hits from
              <Link to={fileLinkUrl}>{item.filePath}</Link>
            </p>
            <CodeBlock
              key={`code${index}`}
              language={item.language}
              startLine={0}
              code={item.content}
              highlightRanges={highlightRanges}
            />
            <EuiSpacer />
          </div>
        );
      });

      const mainComp = (
        <EuiFlexGroup>
          <EuiFlexItem grow={3}>
            <div>
              <p>
                <strong>Repository</strong>
              </p>
              {repoStatsComp}
            </div>
            <EuiSpacer />
            <div>
              <p>
                <strong>Language</strong>
              </p>
              {langStatsComp}
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={7}>
            <div>{statsComp}</div>
            <div>{resultComp}</div>
          </EuiFlexItem>
        </EuiFlexGroup>
      );

      return (
        <div>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiSearchBar defaultQuery={query} onChange={this.onSearchChanged} />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
          {mainComp}
        </div>
      );
    } else {
      return (
        <div>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiSearchBar defaultQuery={query} onChange={this.onSearchChanged} />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
        </div>
      );
    }
  }
}

const mapStateToProps = (state: RootState) => ({
  ...state.documentSearch,
});

const mapDispatchToProps = {
  documentSearch,
};

export const Search = connect(
  mapStateToProps,
  mapDispatchToProps
)(SearchPage);
