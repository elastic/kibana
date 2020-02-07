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

import { getAllDepNames } from './package_globs';
import { wordRegExp, unwrapTypesPackage } from './utils';

interface PackageGroup {
  /**
   * The group name, will be used for the branch name and in pr titles
   */
  readonly name: string;

  /**
   * Specific words that, when found in the package name, identify it as part of this group
   */
  readonly packageWords?: string[];

  /**
   * Exact package names that should be included in this group
   */
  readonly packageNames?: string[];

  /**
   * Extra labels to apply to PRs created for packages in this group
   */
  readonly extraLabels?: string[];

  /**
   * A flag that will prevent renovatebot from telling us when there
   * are updates. This should only be used in very special cases, like
   * when we intend to never update a package. To just prevent a version
   * upgrade consider support for the `allowedVersions` config, or just
   * closing PRs to communicate to renovate that the specific upgrade
   * should be ignored.
   */
  readonly enabled?: false;

  /**
   * A semver range defining allowed versions for a package group
   * https://renovatebot.com/docs/configuration-options/#allowedversions
   */
  readonly allowedVersions?: string;

  /**
   * An array of users to request reviews from
   */
  readonly reviewers?: string[];

  /**
   * Unless this is set to true, then PRs will only be opened when
   * the corresponding checkbox is ticked in the master issue.
   */
  readonly autoOpenPr?: boolean;
}

export const RENOVATE_PACKAGE_GROUPS: PackageGroup[] = [
  {
    name: 'eslint',
    packageWords: ['eslint'],
  },

  {
    name: 'babel',
    packageWords: ['babel'],
    packageNames: ['core-js', '@babel/preset-react', '@babel/preset-typescript'],
  },

  {
    name: 'jest',
    packageWords: ['jest'],
  },

  {
    name: '@elastic/charts',
    packageNames: ['@elastic/charts'],
    reviewers: ['markov00'],
    autoOpenPr: true,
  },

  {
    name: 'mocha',
    packageWords: ['mocha'],
  },

  {
    name: 'karma',
    packageWords: ['karma'],
  },

  {
    name: 'gulp',
    packageWords: ['gulp'],
  },

  {
    name: 'grunt',
    packageWords: ['grunt'],
  },

  {
    name: 'angular',
    packageWords: ['angular'],
  },

  {
    name: 'd3',
    packageWords: ['d3'],
  },

  {
    name: 'react',
    packageWords: ['react', 'redux', 'enzyme'],
    packageNames: ['ngreact', 'recompose', 'prop-types', 'typescript-fsa-reducers', 'reselect'],
  },

  {
    name: 'moment',
    packageWords: ['moment'],
  },

  {
    name: 'graphql',
    packageWords: ['graphql', 'apollo'],
  },

  {
    name: 'webpack',
    packageWords: ['webpack', 'loader', 'acorn', 'terser'],
    packageNames: ['mini-css-extract-plugin', 'chokidar'],
  },

  {
    name: 'vega',
    packageWords: ['vega'],
    enabled: false,
  },

  {
    name: 'language server',
    packageNames: ['vscode-jsonrpc', 'vscode-languageserver', 'vscode-languageserver-types'],
  },

  {
    name: 'hapi',
    packageWords: ['hapi'],
    packageNames: ['hapi', 'joi', 'boom', 'hoek', 'h2o2', '@elastic/good', 'good-squeeze', 'inert'],
  },

  {
    name: 'dragselect',
    packageNames: ['dragselect'],
    extraLabels: [':ml'],
  },

  {
    name: 'api-documenter',
    packageNames: ['@microsoft/api-documenter', '@microsoft/api-extractor'],
    enabled: false,
  },

  {
    name: 'jsts',
    packageNames: ['jsts'],
    allowedVersions: '^1.6.2',
  },

  {
    name: 'storybook',
    packageWords: ['storybook'],
  },

  {
    name: 'typescript',
    packageWords: ['ts', 'typescript'],
    packageNames: ['tslib'],
  },
];

/**
 * Auto-define package groups for any `@types/*` deps that are not already in a group
 */
for (const dep of getAllDepNames()) {
  const typesFor = unwrapTypesPackage(dep);
  if (!typesFor) {
    continue;
  }

  // determine if one of the existing groups has typesFor in its
  // packageNames or if any of the packageWords is in typesFor
  const existing = RENOVATE_PACKAGE_GROUPS.some(
    group =>
      (group.packageNames || []).includes(typesFor) ||
      (group.packageWords || []).some(word => wordRegExp(word).test(typesFor))
  );

  if (existing) {
    continue;
  }

  RENOVATE_PACKAGE_GROUPS.push({
    name: typesFor,
    packageNames: [typesFor],
  });
}
