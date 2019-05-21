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

const dedent = require('dedent');
const getopts = require('getopts');
const { Cluster } = require('../cluster');
const { createCliError } = require('../errors');

exports.description = 'Install and run from an Elasticsearch tar';

exports.usage = 'es archive <path> [<args>]';

exports.help = (defaults = {}) => {
  const { password = 'changeme', 'base-path': basePath } = defaults;

  return dedent`
    Options:

      --base-path       Path containing cache/installations [default: ${basePath}]
      --install-path    Installation path, defaults to 'source' within base-path
      --password        Sets password for elastic user [default: ${password}]
      --password.[user] Sets password for native realm user [default: ${password}]
      -E                Additional key=value settings to pass to Elasticsearch

    Example:

      es archive ../elasticsearch.tar.gz -E cluster.name=test -E path.data=/tmp/es-data
  `;
};

exports.run = async (defaults = {}) => {
  const argv = process.argv.slice(2);
  const options = getopts(argv, {
    alias: {
      basePath: 'base-path',
      installPath: 'install-path',
      esArgs: 'E',
    },

    default: defaults,
  });

  const cluster = new Cluster();
  const [, path] = options._;

  if (!path || !path.endsWith('tar.gz')) {
    throw createCliError('you must provide a path to an ES tar file');
  }

  const { installPath } = await cluster.installArchive(path, options);
  await cluster.run(installPath, { esArgs: options.esArgs });
};
