/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { inspect } from 'util';

import Axios from 'axios';
import gql from 'graphql-tag';
import * as GraphqlPrinter from 'graphql/language/printer';
import { DocumentNode } from 'graphql/language/ast';
import makeTerminalLink from 'terminal-link';
import { ToolingLog } from '@kbn/dev-utils';

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

/**
 * Send a single request to the Github v4 GraphQL API
 */
async function gqlRequest(
  token: string,
  query: DocumentNode,
  variables: Record<string, unknown> = {}
) {
  const resp = await Axios.request({
    url: 'https://api.github.com/graphql',
    method: 'POST',
    headers: {
      'user-agent': '@kbn/release-notes',
      authorization: `bearer ${token}`,
    },
    data: {
      query: GraphqlPrinter.print(query),
      variables,
    },
  });

  return resp.data;
}

/**
 * Convert the Github API response into the structure used by this tool
 *
 * @param node A GraphQL response from Github using the PrNode fragment
 */
function parsePullRequestNode(node: any): PullRequest {
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
    note: getNoteFromDescription(node.bodyHTML),
  };
}

/**
 * Iterate all of the PRs which have the `version` label
 */
export async function* iterRelevantPullRequests(token: string, version: Version, log: ToolingLog) {
  let nextCursor: string | undefined;
  let hasNextPage = true;

  while (hasNextPage) {
    const resp = await gqlRequest(
      token,
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
      yield parsePullRequestNode(node);
    }
  }
}

export async function getPr(token: string, number: number) {
  const resp = await gqlRequest(
    token,
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

  return parsePullRequestNode(node);
}
