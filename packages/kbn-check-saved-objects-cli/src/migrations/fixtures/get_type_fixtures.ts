/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { fileToJson } from '../../util/json';
import type { ModelVersionFixtures } from './types';
import { FIXTURES_BASE_PATH } from './constants';
import { createFixtureFile } from './create_fixture_file';
import { isValidFixtureFile } from './is_valid_fixture_file';

export async function getTypeFixtures({
  type,
  previous,
  current,
  generate,
}: {
  type: SavedObjectsType<any>;
  previous: string;
  current: string;
  generate: boolean;
}) {
  const name = type.name;
  const fixturesPath = join(FIXTURES_BASE_PATH, name, `${current}.json`);
  const fixtures = (await fileToJson(fixturesPath)) as ModelVersionFixtures;
  if (!fixtures) {
    if (generate) {
      await createFixtureFile({
        type,
        path: fixturesPath,
        current,
        previous,
      });
      throw new Error(
        `❌ '${name}' SO type is missing test fixtures for '${current}'. Please populate sample data on '${fixturesPath}'.`
      );
    } else {
      throw new Error(
        `❌ '${name}' SO type is missing test fixtures for the new modelVersion '${current}'. Please run with --fix to generate '${fixturesPath}' and then add sample data.`
      );
    }
  } else if (!isValidFixtureFile(fixtures, previous, current)) {
    throw new Error(
      `❌ The contents of '${fixturesPath}' are invalid. Please ensure it:
{
  "${previous}": [
    // has one or more documents of type ${name} on version ${previous}
  ],
  "${current}": [
    // what the documents above should look like after migrating them to ${current}
  ],
}`
    );
  } else {
    return fixtures;
  }
}
