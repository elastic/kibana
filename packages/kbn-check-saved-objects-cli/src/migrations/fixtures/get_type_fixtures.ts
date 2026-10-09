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
import { RULE_IDS, SavedObjectsCheckError } from '../../findings';
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
      throw new SavedObjectsCheckError({
        ruleId: RULE_IDS.MODEL_VERSION_FIXTURE_MISSING,
        severity: 'error',
        typeName: name,
        message: `'${name}' SO type is missing test fixtures for '${current}'.`,
        fixHint: `The template file '${path}' has been generated. Populate it with sample documents.`,
        docsAnchor: '#defining-model-versions',
      });
    } else {
      throw new SavedObjectsCheckError({
        ruleId: RULE_IDS.MODEL_VERSION_FIXTURE_MISSING,
        severity: 'error',
        typeName: name,
        message: `'${name}' SO type is missing test fixtures for the new modelVersion '${current}'.`,
        fixHint: `Run with --fix to generate the template file '${path}', then populate it with sample documents.`,
        docsAnchor: '#defining-model-versions',
      });
    }
  } else if (!isValidFixtureFile(fixtures, previous, current)) {
    throw new SavedObjectsCheckError({
      ruleId: RULE_IDS.MODEL_VERSION_FIXTURE_INVALID,
      severity: 'error',
      typeName: name,
      message: `The contents of '${path}' are invalid.`,
      fixHint: `Ensure the file contains a JSON object with a '${previous}' key (documents of type '${name}' on version ${previous}) and a '${current}' key (those documents after migration to ${current}), each holding a non-empty array.`,
      docsAnchor: '#defining-model-versions',
    });
  } else {
    return fixtures;
  }
}
