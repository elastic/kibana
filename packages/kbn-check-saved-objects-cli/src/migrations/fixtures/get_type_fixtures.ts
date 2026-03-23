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
import { fileToJson } from '../../util';
import type { ModelVersionFixtures } from './types';
import { FIXTURES_BASE_PATH } from './constants';
import { createFixtureFile } from './create_fixture_file';
import { isValidFixtureFile } from './is_valid_fixture_file';

export function getFixturesBasePath(type: string, modelVersion: string): string {
  return join(FIXTURES_BASE_PATH, type, `${modelVersion}.json`);
}

export async function getTypeFixtures({
  path,
  type,
  previous,
  current,
  generate,
}: {
  path: string;
  type: SavedObjectsType<any>;
  previous: string;
  current: string;
  generate: boolean;
}) {
  const name = type.name;
  const fixtures = (await fileToJson(path)) as ModelVersionFixtures;
  if (!fixtures) {
    if (generate) {
      await createFixtureFile({
        type,
        path,
        current,
        previous,
      });
      throw new Error(
        `❌ '${name}' SO type is missing test fixtures for '${current}'. Please populate sample data on '${path}'.`
      );
    } else {
      throw new Error(
        `❌ '${name}' SO type is missing test fixtures for the new modelVersion '${current}'. Please run with --fix to generate '${path}' and then add sample data.`
      );
    }
  } else if (!isValidFixtureFile(fixtures, previous, current)) {
    throw new Error(
      `❌ The contents of '${path}' are invalid. Please ensure it:
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
