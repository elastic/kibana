/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import inquirer from 'inquirer';

export interface Answers {
  name: string;
  internal: boolean;
  internalLocation: string;
  ui: boolean;
  server: boolean;
  githubTeam?: string;
  ownerName: string;
  description?: string;
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
    name: 'description',
    message: 'Provide a description for your plugin.',
    default: undefined,
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
    name: 'ownerName',
    message: 'Who is developing and maintaining this plugin?',
    default: undefined,
    when: ({ internal }: Answers) => !internal,
  },
  {
    name: 'ownerName',
    message: 'What team will maintain this plugin?',
    default: undefined,
    when: ({ internal }: Answers) => internal,
  },
  {
    name: 'githubTeam',
    message: 'What is your gitHub team alias?',
    default: undefined,
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
