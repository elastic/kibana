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
   * Prevent `@types/*` packages matching the packageWords and packageNames from being included
   * in this group
   */
  readonly excludeTypes?: true;

  /**
   * Extra labels to apply to PRs created for packages in this group
   */
  readonly extraLabels?: string[];
}

export const RENOVATE_PACKAGE_GROUPS: PackageGroup[] = [
  {
    name: 'eslint',
    packageWords: ['eslint'],
  },

  {
    name: 'babel',
    packageWords: ['babel'],
    packageNames: ['core-js'],
  },

  {
    name: 'jest',
    packageWords: ['jest'],
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
    name: 'graphql',
    packageWords: ['graphql'],
  },

  {
    name: 'webpack',
    packageWords: ['webpack', 'loader'],
    packageNames: ['mini-css-extract-plugin', 'chokidar'],
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
];
