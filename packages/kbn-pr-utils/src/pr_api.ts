/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { inspect } from 'util';

import Axios, { Method } from 'axios';
import gql from 'graphql-tag';
import * as GraphqlPrinter from 'graphql/language/printer';
import { DocumentNode } from 'graphql/language/ast';
import makeTerminalLink from 'terminal-link';
import { ToolingLog, isAxiosResponseError } from '@kbn/dev-utils';

const PrNodeFragment = gql`
  fragment PrNode on PullRequest {
    id
    number
    url
    title
    bodyText
    bodyHTML
    mergedAt
    baseRefName
    state
    author {
      login
      ... on User {
        name
      }
    }
    labels(first: 100) {
      nodes {
        name
      }
    }
    commits(last: 1) {
      nodes {
        commit {
          oid
          statusCheckRollup {
            state
          }
          status {
            outdated: context(name: "prbot:outdated") {
              state
              createdAt
            }
            kibanaCi: context(name: "kibana-ci") {
              state
              createdAt
            }
            esDocs: context(name: "elasticsearch-ci/docs") {
              state
              createdAt
            }
          }
        }
      }
    }
  }
`;

interface PrNodeGraphQlCommit {
  oid: string;
  statusCheckRollup: {
    state: PrNodeGraphQlCommitStatus['state'];
  };
  status: {
    outdated: null | PrNodeGraphQlCommitStatus;
    kibanaCi: null | PrNodeGraphQlCommitStatus;
    esDocs: null | PrNodeGraphQlCommitStatus;
  };
}

interface PrNodeGraphQlCommitStatus {
  createdAt: string;
  state: 'SUCCESS' | 'FAILURE' | 'PENDING';
}

interface PullRequestStatus {
  state: PrNodeGraphQlCommitStatus['state'];
  createdAt: number;
}

export interface PullRequest {
  nodeId: string;
  number: number;
  url: string;
  title: string;
  targetBranch: string;
  mergedAt: string;
  state: string;
  labels: string[];
  user: {
    name: string;
    login: string;
  };
  terminalLink: string;
  head: {
    sha: string;
    overallStatus: PullRequestStatus['state'];
    status: {
      outdated: null | PullRequestStatus;
      kibanaCi: null | PullRequestStatus;
      esDocs: null | PullRequestStatus;
    };
  };
}

export class PrApi {
  constructor(private readonly log: ToolingLog, private readonly token: string) {}

  async getPr(number: number) {
    const resp = await this.gqlRequest(
      gql`
        query ($number: Int!) {
          repository(owner: "elastic", name: "kibana") {
            pullRequest(number: $number) {
              ...PrNode
            }
          }
        }
        ${PrNodeFragment}
      `,
      {
        number,
      }
    );

    const node = resp.data?.repository?.pullRequest;
    if (!node) {
      throw new Error(`unexpected github response, unable to fetch PR: ${inspect(resp)}`);
    }

    return this.parsePullRequestNode(node);
  }

  async leaveAComment(pr: PullRequest, body: string) {
    await this.gqlRequest(
      gql`
        mutation ($subj: String!, $body: String!) {
          addComment(input: { subjectId: $subj, body: $body }) {
            commentEdge {
              node {
                createdAt
              }
            }
          }
        }
      `,
      {
        subj: pr.nodeId,
        body,
      }
    );
  }

  async setCommitStatus(
    pr: PullRequest,
    options: {
      context: string;
      state: 'error' | 'failure' | 'pending' | 'success';
      description: string;
      targetUrl?: string;
    }
  ) {
    await this.restRequest({
      method: 'POST',
      path: `/repos/elastic/kibana/statuses/${pr.head.sha}`,
      body: {
        state: options.state,
        context: options.context,
        description: options.description,
        target_url: options.targetUrl,
      },
    });
  }

  /**
   * Iterate all of the PRs which have the `version` label
   */
  async *iterOpenPullRequests() {
    let nextCursor: string | undefined;
    let hasNextPage = true;

    while (hasNextPage) {
      const resp = await this.gqlRequest(
        gql`
          query ($cursor: String) {
            repository(owner: "elastic", name: "kibana") {
              pullRequests(first: 100, after: $cursor, states: OPEN) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                nodes {
                  ...PrNode
                }
              }
            }
          }
          ${PrNodeFragment}
        `,
        {
          cursor: nextCursor,
        }
      );

      const pullRequests = resp.data?.repository?.pullRequests;
      if (!pullRequests) {
        throw new Error(`unexpected github response, unable to fetch PRs: ${inspect(resp)}`);
      }

      hasNextPage = pullRequests.pageInfo?.hasNextPage;
      nextCursor = pullRequests.pageInfo?.endCursor;

      if (hasNextPage === undefined || (hasNextPage && !nextCursor)) {
        throw new Error(
          `github response does not include valid pagination information: ${inspect(resp)}`
        );
      }

      for (const node of pullRequests.nodes) {
        yield this.parsePullRequestNode(node);
      }
    }
  }

  /**
   * Convert the Github API response into the structure used by this tool
   *
   * @param node A GraphQL response from Github using the PrNode fragment
   */
  private parsePullRequestNode(node: any): PullRequest {
    const terminalLink = makeTerminalLink(`#${node.number}`, node.url);

    const labels: string[] = node.labels.nodes.map((l: { name: string }) => l.name);
    const headCommit: PrNodeGraphQlCommit | undefined = node.commits?.nodes?.[0]?.commit;
    if (!headCommit) {
      throw new Error('PR came back from graphql API without a commit');
    }

    return {
      nodeId: node.id,
      number: node.number,
      url: node.url,
      terminalLink,
      title: node.title,
      targetBranch: node.baseRefName,
      state: node.state,
      mergedAt: node.mergedAt,
      labels,
      user: {
        login: node.author?.login || 'deleted user',
        name: node.author?.name,
      },
      head: {
        sha: headCommit.oid,
        overallStatus: headCommit.statusCheckRollup.state,
        status: {
          outdated: headCommit.status.outdated
            ? {
                state: headCommit.status.outdated.state,
                createdAt: new Date(headCommit.status.outdated.createdAt).valueOf(),
              }
            : null,
          kibanaCi: headCommit.status.kibanaCi
            ? {
                state: headCommit.status.kibanaCi.state,
                createdAt: new Date(headCommit.status.kibanaCi.createdAt).valueOf(),
              }
            : null,
          esDocs: headCommit.status.esDocs
            ? {
                state: headCommit.status.esDocs.state,
                createdAt: new Date(headCommit.status.esDocs.createdAt).valueOf(),
              }
            : null,
        },
      },
    };
  }

  /**
   * Send a single request to the Github v4 GraphQL API
   */
  private async gqlRequest(query: DocumentNode, variables: Record<string, unknown> = {}) {
    return await this.handleGithubHttpErrors(async () => {
      const resp = await Axios.request({
        url: 'https://api.github.com/graphql',
        method: 'POST',
        headers: {
          'user-agent': '@kbn/pr-utils',
          authorization: `bearer ${this.token}`,
        },
        data: {
          query: GraphqlPrinter.print(query),
          variables,
        },
      });

      return resp.data;
    });
  }

  private async restRequest<T>(options: { method: Method; path: string; body?: any }) {
    return await this.handleGithubHttpErrors(async () => {
      const resp = await Axios.request<T>({
        baseURL: 'https://api.github.com',
        headers: {
          'user-agent': '@kbn/pr-utils',
          authorization: `token ${this.token}`,
          accept: 'application/vnd.github.v3+json',
        },
        method: options.method,
        url: options.path,
        data: options.body,
      });

      return resp.data;
    });
  }

  private async handleGithubHttpErrors<T>(fetch: () => Promise<T>) {
    let attempt = 0;

    while (true) {
      attempt += 1;

      try {
        return await fetch();
      } catch (error) {
        if (!isAxiosResponseError(error)) {
          // rethrow error unless it is a 500+ response from github
          throw error;
        }

        const { status, data } = error.response;
        const resp = inspect(data);

        if (error.response.status >= 400 && error.response.status < 500) {
          throw new Error(`${status} response from Github: [${resp}]`);
        }

        if (attempt === 5) {
          throw new Error(
            `${status} response from Github, attempted request ${attempt} times: [${resp}]`
          );
        }

        const delay = attempt * 2000;
        this.log.debug(`Github responded with ${status}, retrying in ${delay} ms: [${resp}]`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }
}
