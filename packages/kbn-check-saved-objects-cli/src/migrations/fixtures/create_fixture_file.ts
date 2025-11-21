/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ModelVersionIdentifier, SavedObjectsType } from '@kbn/core-saved-objects-server';
import { createFixtureTemplate } from './create_fixture_template';
import { jsonToFile } from '../../util/json';

export async function createFixtureFile({
  type,
  path,
  previous,
  current,
}: {
  type: SavedObjectsType<any>;
  path: string;
  previous: string;
  current: string;
}) {
  // auto-generate the file
  const modelVersions =
    typeof type.modelVersions === 'function' ? type.modelVersions() : type.modelVersions!;
  const lastModelVersion = modelVersions[current.split('.')[1] as ModelVersionIdentifier];
  const typeTemplate = createFixtureTemplate(lastModelVersion!);

  await jsonToFile(path, {
    [previous]: [
      {
        TODO: `Please create one or more test objects with properties that reflect real '${type}' objects`,
        NOTE: `That each modelVersion has a corresponding fixture file, which defines the previous and current versions.`,
        HINT: `You can use the template below and create sample objects for ${previous} and ${current} versions.`,
        HINT2: `Alternatively, you can copy the contents from older fixture files (if they exist) and adapt them accordingly.`,
      },
    ],
    [current]: [typeTemplate],
  });
}
