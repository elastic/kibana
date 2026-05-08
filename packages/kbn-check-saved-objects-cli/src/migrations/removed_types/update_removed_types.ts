/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { jsonToFile } from '../../util/json';
import { RULE_IDS, SavedObjectsCheckError } from '../../findings';
import { REMOVED_TYPES_JSON_PATH } from './constants';

/**
 * Updates the removed_types.json file by adding new removed types.
 * Always throw an error to fail the check either to prompt for --fix or to indicate the file was updated.
 */
export async function updateRemovedTypes(
  removedTypes: string[],
  currentRemovedTypes: string[],
  fix: boolean
) {
  if (fix) {
    const allTypes = [...currentRemovedTypes, ...removedTypes].sort();
    await jsonToFile(REMOVED_TYPES_JSON_PATH, allTypes);
  }

  const message = fix
    ? `The following SO types are no longer registered: '${removedTypes.join(
        ', '
      )}'. Updated 'removed_types.json' to prevent the same names from being reused in the future.`
    : `The following SO types are no longer registered: '${removedTypes.join(
        ', '
      )}'. Please run with --fix to update 'removed_types.json'.`;

  throw new SavedObjectsCheckError({
    ruleId: RULE_IDS.REMOVED_TYPE_NEEDS_UPDATE,
    severity: 'error',
    typeName: removedTypes[0],
    message,
    fixHint: fix
      ? `Commit the updated 'removed_types.json' alongside your changes.`
      : `Run 'node scripts/check_saved_objects --baseline <sha> --fix' locally to update 'removed_types.json' and commit it.`,
    docsAnchor: '#defining-model-versions',
  });
}
