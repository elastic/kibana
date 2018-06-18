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

exports.description = 'Downloads and run from a nightly snapshot';

exports.help = (defaults = {}) => {
  const {
    license = 'basic',
    password = 'changeme',
    'base-path': basePath,
  } = defaults;

  return dedent`
    Options:

      --license       Run with a 'oss', 'basic', or 'trial' license [default: ${license}]
      --version       Version of ES to download [default: ${defaults.version}]
      --base-path     Path containing cache/installations [default: ${basePath}]
      --install-path  Installation path, defaults to 'source' within base-path
      --password      Sets password for elastic user [default: ${password}]
      -E              Additional key=value settings to pass to Elasticsearch

    Example:

      es snapshot --version 5.6.8 -E cluster.name=test -E path.data=/tmp/es-data
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
  const { installPath } = await cluster.installSnapshot(options);
  await cluster.run(installPath, { esArgs: options.esArgs });
};
