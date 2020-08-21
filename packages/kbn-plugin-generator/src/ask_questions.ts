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

import Path from 'path';

import { REPO_ROOT } from '@kbn/dev-utils';
import inquirer from 'inquirer';

export interface Answers {
  name: string;
  internal: boolean;
  internalLocation: string;
  ui: boolean;
  server: boolean;
}

export const INTERNAL_PLUGIN_LOCATIONS: Array<{ name: string; value: string }> = [
  {
    name: 'Kibana Example',
    value: Path.resolve(REPO_ROOT, 'examples'),
  },
  {
    name: 'Kibana OSS',
    value: Path.resolve(REPO_ROOT, 'src/plugins'),
  },
  {
    name: 'Kibana OSS Functional Testing',
    value: Path.resolve(REPO_ROOT, 'test/plugin_functional/plugins'),
  },
  {
    name: 'X-Pack',
    value: Path.resolve(REPO_ROOT, 'x-pack/plugins'),
  },
  {
    name: 'X-Pack Functional Testing',
    value: Path.resolve(REPO_ROOT, 'x-pack/test/plugin_functional/plugins'),
  },
];

export const QUESTIONS = [
  {
    name: 'name',
    message: 'Plugin name (use camelCase)',
    default: undefined,
    validate: (name: string) => (!name ? 'name is required' : true),
  },
  {
    name: 'internal',
    type: 'confirm',
    message: 'Will this plugin be part of the Kibana repository?',
    default: false,
  },
  {
    name: 'internalLocation',
    type: 'list',
    message: 'What type of internal plugin would you like to create',
    choices: INTERNAL_PLUGIN_LOCATIONS,
    default: INTERNAL_PLUGIN_LOCATIONS[0].value,
    when: ({ internal }: Answers) => internal,
  },
  {
    name: 'ui',
    type: 'confirm',
    message: 'Should an UI plugin be generated?',
    default: true,
  },
  {
    name: 'server',
    type: 'confirm',
    message: 'Should a server plugin be generated?',
    default: true,
  },
] as const;

export async function askQuestions(overrides: Partial<Answers>) {
  return await inquirer.prompt<Answers>(QUESTIONS, overrides);
}

export function getDefaultAnswers(overrides: Partial<Answers>) {
  return QUESTIONS.reduce(
    (acc, q) => ({
      ...acc,
      [q.name]: overrides[q.name] != null ? overrides[q.name] : q.default,
    }),
    {}
  ) as Answers;
}
