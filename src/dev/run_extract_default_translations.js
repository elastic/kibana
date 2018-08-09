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

import yargs from 'yargs';

import { run } from './run';
import { extractDefaultTranslations } from './i18n/extract_default_translations';

run(async () => {
  const { argv } = yargs
    .option('path', {
      default: './',
      describe: 'paths to directories for messages searching',
      type: 'array',
    })
    .option('output', {
      default: null,
      describe: '[optional] path to a folder for en.json extraction',
      type: 'string',
    });

  await extractDefaultTranslations({ paths: argv.path, output: argv.output });
});
