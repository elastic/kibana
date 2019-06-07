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

import { RENOVATE_PACKAGE_GROUPS } from './package_groups';
import { PACKAGE_GLOBS } from './package_globs';
import { wordRegExp, maybeFlatMap, maybeMap, getTypePackageName } from './utils';

const DEFAULT_LABELS = ['release_note:skip', 'renovate', 'v8.0.0', 'v7.3.0'];

export const RENOVATE_CONFIG = {
  extends: ['config:base'],

  includePaths: PACKAGE_GLOBS,

  /**
   * Only submit PRs to these branches, we will manually backport PRs for now
   */
  baseBranches: ['master'],

  /**
   * Labels added to PRs opened by renovate
   */
  labels: DEFAULT_LABELS,

  /**
   * Config customizations for major version upgrades
   */
  major: {
    labels: [...DEFAULT_LABELS, 'renovate:major'],
  },

  /**
   * Enable creation of a "Master Issue" within the repository. This
   * Master Issue is akin to a mini dashboard and contains a list of all
   * PRs pending, open, closed (unmerged) or in error.
   */
  masterIssue: true,

  /**
   * Whether updates should require manual approval from within the
   * Master Issue before creation.
   *
   * We can turn this off once we've gotten through the backlog of
   * outdated packages.
   */
  masterIssueApproval: true,

  /**
   * Policy for how to modify/update existing ranges
   * pin = convert ranges to exact versions, e.g. ^1.0.0 -> 1.1.0
   */
  rangeStrategy: 'replace',

  npm: {
    /**
     * This deletes and re-creates the lock file, which we will only want
     * to turn on once we've updated all our deps and enabled version pinning
     */
    lockFileMaintenance: { enabled: false },

    /**
     * Define groups of packages that should be updated/configured together
     */
    packageRules: [
      ...RENOVATE_PACKAGE_GROUPS.map(group => ({
        groupSlug: group.name,
        groupName: `${group.name} related packages`,
        packagePatterns: maybeMap(group.packageWords, word => wordRegExp(word).source),
        packageNames: maybeFlatMap(group.packageNames, name => [name, getTypePackageName(name)]),
        labels: group.extraLabels && [...DEFAULT_LABELS, ...group.extraLabels],
        enabled: group.enabled === false ? false : undefined,
      })),

      // internal/local packages
      {
        packagePatterns: ['^@kbn/.*'],
        enabled: false,
      },
    ],
  },

  /**
   * Limit the number of active PRs renovate will allow
   */
  prConcurrentLimit: 6,

  /**
   * Disable vulnerability alert handling, we handle that separately
   */
  vulnerabilityAlerts: {
    enabled: false,
  },

  /**
   * Disable automatic rebase on each change to base branch
   */
  rebaseStalePrs: false,

  /**
   * Disable semantic commit formating
   */
  semanticCommits: false,
};
