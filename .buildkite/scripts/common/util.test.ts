/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';
import Path from 'path';

const utilPath = Path.resolve(__dirname, 'util.sh');

interface ParentPr {
  baseRefName: string;
  headRefOid: string;
}

interface ParentLookup {
  nodes: ParentPr[];
  hasNextPage?: boolean;
}

const parent = (branch: string, base: string): ParentLookup => ({
  nodes: [{ baseRefName: base, headRefOid: `${branch}-head` }],
});

const resolveBaseline = (stackBase: string, parents: Record<string, ParentLookup>): string => {
  const script = `
    set -euo pipefail
    source "$UTIL_PATH"
    gh() {
      local argument head="" filter=""
      while [[ "$#" -gt 0 ]]; do
        argument="$1"
        case "$argument" in
          head=*) head="\${argument#head=}" ;;
          --jq) shift; filter="$1" ;;
        esac
        shift
      done
      if [[ -n "$head" ]]; then
        jq --arg head "$head" '{data: {repository: {pullRequests: {
          nodes: (.[$head].nodes // []),
          pageInfo: {hasNextPage: (.[$head].hasNextPage // false)}
        }}}}' <<< "$PARENT_BRANCHES" | jq -r "$filter"
      else
        printf '%s\\n' "$STACK_BASE"
      fi
    }
    git() {
      case "$1" in
        fetch)
          [[ "$3" != unavailable-head ]] || return 1
          fetched_branch="$3"
          ;;
        rev-parse) printf '%s-tip\\n' "$fetched_branch" ;;
        merge-base)
          if [[ "$2" != HEAD ]]; then
            if [[ "$3" == "\${2%-tip}-head" ]]; then
              printf '%s\\n' "$2"
            else
              printf '%s\\n' older-common-ancestor
            fi
          elif [[ "$fetched_branch" == main || "$fetched_branch" =~ ^[0-9]+\\.(x|[0-9]+)$ ]]; then
            printf '%s\\n' published-baseline
          else
            printf '%s\\n' unpublished-feature-baseline
          fi
          ;;
        *) return 1 ;;
      esac
    }
    set_git_stack_merge_base
    printf '%s:%s' "$GITHUB_PR_STACK_TARGET_BRANCH" "$GITHUB_PR_STACK_MERGE_BASE"
  `;
  return execFileSync('bash', ['-c', script], {
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      UTIL_PATH: utilPath,
      GITHUB_TOKEN: 'synthetic-token',
      GITHUB_PR_BASE_OWNER: 'elastic',
      GITHUB_PR_BASE_REPO: 'kibana',
      GITHUB_PR_NUMBER: '123',
      GITHUB_PR_TARGET_BRANCH: 'parent-pr',
      GITHUB_PR_MERGE_BASE: 'parent-commit',
      STACK_BASE: stackBase,
      PARENT_BRANCHES: JSON.stringify(parents),
    },
  }).trim();
};

it('finds the main baseline through a mirrored fork PR outside the native stack', () => {
  expect(
    resolveBaseline('mirrored-feature', {
      'mirrored-feature': parent('mirrored-feature', 'main'),
    })
  ).toBe('main:published-baseline');
});

it('follows multiple parent PRs to their release branch', () => {
  expect(
    resolveBaseline('feature-two', {
      'feature-two': parent('feature-two', 'feature-one'),
      'feature-one': parent('feature-one', '9.5'),
    })
  ).toBe('9.5:published-baseline');
});

it.each(['main', '9.5', '8.x'])('keeps a published stack base %s', (base) => {
  expect(resolveBaseline(base, {})).toBe(`${base}:published-baseline`);
});

it('preserves the PR fallback when a fetchable feature branch has no parent PR', () => {
  expect(resolveBaseline('unresolved-feature', {})).toBe('parent-pr:parent-commit');
});

it('preserves the PR fallback when verified parents disagree on their base', () => {
  expect(
    resolveBaseline('feature', {
      feature: {
        nodes: [
          { baseRefName: 'main', headRefOid: 'feature-head' },
          { baseRefName: '9.5', headRefOid: 'feature-head' },
        ],
      },
    })
  ).toBe('parent-pr:parent-commit');
});

it('rejects a same-named fork PR that does not contain the mirrored commit', () => {
  expect(
    resolveBaseline('feature', {
      feature: { nodes: [{ baseRefName: '9.5', headRefOid: 'unrelated-head' }] },
    })
  ).toBe('parent-pr:parent-commit');
});

it('ignores unrelated same-named fork PRs when resolving the parent', () => {
  expect(
    resolveBaseline('feature', {
      feature: {
        nodes: [
          { baseRefName: '9.5', headRefOid: 'unrelated-head' },
          { baseRefName: 'main', headRefOid: 'feature-head' },
        ],
      },
    })
  ).toBe('main:published-baseline');
});

it('preserves the PR fallback when one of the candidate heads cannot be verified', () => {
  expect(
    resolveBaseline('feature', {
      feature: {
        nodes: [
          { baseRefName: 'main', headRefOid: 'feature-head' },
          { baseRefName: '9.5', headRefOid: 'unavailable-head' },
        ],
      },
    })
  ).toBe('parent-pr:parent-commit');
});

it('preserves the PR fallback when there are more candidate PRs to inspect', () => {
  expect(
    resolveBaseline('feature', {
      feature: { ...parent('feature', 'main'), hasNextPage: true },
    })
  ).toBe('parent-pr:parent-commit');
});

it('preserves the fallback when parent branches form a cycle', () => {
  expect(
    resolveBaseline('feature-one', {
      'feature-one': parent('feature-one', 'feature-two'),
      'feature-two': parent('feature-two', 'feature-one'),
    })
  ).toBe('parent-pr:parent-commit');
});
