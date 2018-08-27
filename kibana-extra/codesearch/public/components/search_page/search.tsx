/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPagination, EuiSearchBar, EuiSpacer } from '@elastic/eui';
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
  page?: number;
  isLoading: boolean;
  error?: Error;
  searchResult?: DocumentSearchResult;
  documentSearch: (q: string, p: number) => void;
}

interface State {
  uri: string;
}

class SearchPage extends React.PureComponent<Props, State> {
  public state = {
    uri: '',
  };

  public onSearchChanged = ({ query }) => {
    this.props.documentSearch(query.text, 1);
    // Update the url and push to history as well.
    history.push(`/search?q=${query.text}&p=1`);
  };

  public onPageClicked = (page: number) => {
    const { query } = this.props;
    history.push(`/search?q=${query}&p=${page + 1}`);
  };

  public render() {
    const { query, searchResult } = this.props;

    if (searchResult) {
      const { stats, result } = searchResult!;
      const { total, from, to, page, totalPage, repoStats, languageStats } = stats;

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

      const resultComp = result.map(item => {
        const repoLinkUrl = `/${item.uri}/tree/HEAD/`;
        const fileLinkUrl = `/${item.uri}/blob/HEAD/${item.filePath}`;
        const key = `${query}${item.uri}${item.filePath}`;
        return (
          <div key={`resultitem${key}`}>
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
              key={`code${key}`}
              language={item.language}
              startLine={0}
              code={item.processedResult.getSearchResultContent()}
              highlightRanges={item.processedResult.getHighlightRanges()}
              folding={false}
              lineNumbersFunc={item.processedResult.getLineNumberFunc()}
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
          <EuiSpacer />
          <EuiFlexGroup justifyContent="spaceAround">
            <EuiFlexItem grow={false}>
              <EuiPagination
                pageCount={totalPage}
                activePage={page - 1}
                onPageClick={this.onPageClicked}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
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
