/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiSearchBar,
  EuiSpacer,
} from '@elastic/eui';
import querystring from 'querystring';
import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import Url from 'url';

import { RepositoryUtils } from '../../../common/repository_utils';
import { DocumentSearchResult } from '../../../model';
import { documentSearch } from '../../actions';
import { RootState } from '../../reducers';
import { history } from '../../utils/url';
import { CodeBlock } from '../codeblock/codeblock';

interface Props {
  query: string;
  page?: number;
  languages?: Set<string>;
  repositories?: Set<string>;
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
    // Update the url and push to history as well.
    const queries = querystring.parse(history.location.search.replace('?', ''));
    history.push(
      Url.format({
        pathname: '/search',
        query: {
          ...queries,
          q: query.text,
        },
      })
    );
  };

  public onPageClicked = (page: number) => {
    const { query } = this.props;
    const queries = querystring.parse(history.location.search.replace('?', ''));
    history.push(
      Url.format({
        pathname: '/search',
        query: {
          ...queries,
          q: query,
          p: page + 1,
        },
      })
    );
  };

  public onLanguageFilterToggled = (lang: string) => {
    const { languages, repositories, query, page } = this.props;
    let tempLangs: Set<string> = new Set();
    if (languages && languages.has(lang)) {
      // Remove this language filter
      tempLangs = new Set(languages);
      tempLangs.delete(lang);
    } else {
      // Add this language filter
      tempLangs = languages ? new Set(languages) : new Set();
      tempLangs.add(lang);
    }
    const queries = querystring.parse(history.location.search.replace('?', ''));
    return () => {
      history.push(
        Url.format({
          pathname: '/search',
          query: {
            ...queries,
            q: query,
            p: page,
            langs: Array.from(tempLangs).join(','),
            repos: repositories ? Array.from(repositories).join(',') : undefined,
          },
        })
      );
    };
  };

  public onRepositoryFilterToggled = (repo: string) => {
    const { languages, repositories, query, page } = this.props;
    let tempRepos: Set<string> = new Set();
    if (repositories && repositories.has(repo)) {
      // Remove this repository filter
      tempRepos = new Set(repositories);
      tempRepos.delete(repo);
    } else {
      // Add this language filter
      tempRepos = repositories ? new Set(repositories) : new Set();
      tempRepos.add(repo);
    }
    const queries = querystring.parse(history.location.search.replace('?', ''));
    return () => {
      history.push(
        Url.format({
          pathname: '/search',
          query: {
            ...queries,
            q: query,
            p: page,
            langs: languages ? Array.from(languages).join(',') : undefined,
            repos: Array.from(tempRepos).join(','),
          },
        })
      );
    };
  };

  public render() {
    const { query, searchResult, languages, repositories } = this.props;

    if (searchResult) {
      const { stats, results } = searchResult!;
      const { total, from, to, page, totalPage, repoStats, languageStats } = stats;

      const repoStatsComp = repoStats.map((item, index) => {
        if (!!repositories && repositories.has(item.name)) {
          return (
            <div key={`repostats${index}`}>
              <EuiBadge
                iconType="cross"
                iconSide="right"
                color="primary"
                iconOnClick={this.onRepositoryFilterToggled(item.name)}
                iconOnClickAriaLabel="Unselect this repository."
              >
                {RepositoryUtils.repoNameFromUri(item.name)} {item.value}
              </EuiBadge>
            </div>
          );
        } else {
          return (
            <div key={`repostats${index}`}>
              <EuiBadge
                onClick={this.onRepositoryFilterToggled(item.name)}
                onClickAriaLabel="Select this repository"
              >
                {RepositoryUtils.repoNameFromUri(item.name)} {item.value}
              </EuiBadge>
            </div>
          );
        }
      });

      const langStatsComp = languageStats.map((item, index) => {
        if (languages && languages.has(item.name)) {
          return (
            <div key={`langstats${index}`}>
              <EuiBadge
                iconType="cross"
                iconSide="right"
                color="primary"
                iconOnClick={this.onLanguageFilterToggled(item.name)}
                iconOnClickAriaLabel="Unselect this language."
              >
                {item.name} {item.value}
              </EuiBadge>
            </div>
          );
        } else {
          return (
            <div key={`repostats${index}`}>
              <EuiBadge
                onClick={this.onLanguageFilterToggled(item.name)}
                onClickAriaLabel="Select this language"
              >
                {item.name} {item.value}
              </EuiBadge>
            </div>
          );
        }
      });

      const statsComp = (
        <div>
          <p>
            Showing {from} - {to} of {total} results.
          </p>
          <EuiSpacer />
        </div>
      );

      const resultComps = results!.map(item => {
        const { uri, filePath, hits, compositeContent } = item;
        const { content, lineMapping, ranges } = compositeContent;
        const repoLinkUrl = `/${uri}/tree/HEAD/`;
        const fileLinkUrl = `/${uri}/blob/HEAD/${filePath}`;
        const key = `${query}${uri}${filePath}`;
        const lineMappingFunc = (l: number) => {
          return lineMapping[l - 1];
        };
        return (
          <div key={`resultitem${key}`}>
            <p>
              <Link to={repoLinkUrl}>
                <strong>{RepositoryUtils.repoFullNameFromUri(uri)}</strong>
              </Link>
            </p>
            <p>
              &nbsp;&nbsp;&nbsp;&nbsp;
              {hits} hits from&nbsp;
              <Link to={fileLinkUrl}>{filePath}</Link>
            </p>
            <CodeBlock
              key={`code${key}`}
              language={item.language}
              startLine={0}
              code={content}
              highlightRanges={ranges}
              folding={false}
              lineNumbersFunc={lineMappingFunc}
            />
            <EuiSpacer />
          </div>
        );
      });

      const mainComp = (
        <EuiFlexGroup>
          <EuiFlexItem grow={2}>
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
          <EuiFlexItem grow={8}>
            <div>{statsComp}</div>
            <div>{resultComps}</div>
          </EuiFlexItem>
        </EuiFlexGroup>
      );

      return (
        <div>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiSearchBar defaultQuery={query} query={query} onChange={this.onSearchChanged} />
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
