/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { inspect } from 'util';

import Axios from 'axios';
import gql from 'graphql-tag';
import * as GraphqlPrinter from 'graphql/language/printer';
import { DocumentNode } from 'graphql/language/ast';
import makeTerminalLink from 'terminal-link';
import { ToolingLog, isAxiosResponseError } from '@kbn/dev-utils';

import { Version } from './version';
import { getFixReferences } from './get_fix_references';
import { getNoteFromDescription } from './get_note_from_description';

const PrNodeFragment = gql`
  fragment PrNode on PullRequest {
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
  }
`;

export interface PullRequest {
  number: number;
  url: string;
  title: string;
  targetBranch: string;
  mergedAt: string;
  state: string;
  labels: string[];
  fixes: string[];
  user: {
    name: string;
    login: string;
  };
  versions: Version[];
  terminalLink: string;
  note?: string;
}

export class PrApi {
  constructor(private readonly log: ToolingLog, private readonly token: string) {}

  async getPr(number: number) {
    const resp = await this.gqlRequest(
      gql`
        query($number: Int!) {
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

  /**
   * Iterate all of the PRs which have the `version` label
   */
  async *iterRelevantPullRequests(version: Version) {
    let nextCursor: string | undefined;
    let hasNextPage = true;

    while (hasNextPage) {
      const resp = await this.gqlRequest(
        gql`
          query($cursor: String, $labels: [String!]) {
            repository(owner: "elastic", name: "kibana") {
              pullRequests(first: 100, after: $cursor, labels: $labels, states: MERGED) {
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
          labels: [version.label],
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

    return {
      number: node.number,
      url: node.url,
      terminalLink,
      title: node.title,
      targetBranch: node.baseRefName,
      state: node.state,
      mergedAt: node.mergedAt,
      labels,
      fixes: getFixReferences(node.bodyText),
      user: {
        login: node.author?.login || 'deleted user',
        name: node.author?.name,
      },
      versions: labels
        .map((l) => Version.fromLabel(l))
        .filter((v): v is Version => v instanceof Version),
      note:
        getNoteFromDescription(node.bodyHTML, 'release note') ||
        getNoteFromDescription(node.bodyHTML, 'dev docs'),
    };
  }

  /**
   * Send a single request to the Github v4 GraphQL API
   */
  private async gqlRequest(query: DocumentNode, variables: Record<string, unknown> = {}) {
    let attempt = 0;

    while (true) {
      attempt += 1;

      try {
        const resp = await Axios.request({
          url: 'https://api.github.com/graphql',
          method: 'POST',
          headers: {
            'user-agent': '@kbn/release-notes',
            authorization: `bearer ${this.token}`,
          },
          data: {
            query: GraphqlPrinter.print(query),
            variables,
          },
        });

        return resp.data;
      } catch (error) {
        if (!isAxiosResponseError(error) || error.response.status < 500) {
          // rethrow error unless it is a 500+ response from github
          throw error;
        }

        const { status, data } = error.response;
        const resp = inspect(data);

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
