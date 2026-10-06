/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type {
  SavedObjectsValidationMap,
  SavedObjectSanitizedDoc,
} from '@kbn/core-saved-objects-server';
/**
 * Helper class that takes a {@link SavedObjectsValidationMap} and runs validations for a
 * given type based on the provided Kibana version.
 *
 * @internal
 */
export declare class SavedObjectsTypeValidator {
  private readonly log;
  private readonly type;
  private readonly defaultVersion;
  private readonly validationMap;
  private readonly orderedVersions;
  constructor({
    logger,
    type,
    validationMap,
    defaultVersion,
  }: {
    logger: Logger;
    type: string;
    validationMap: SavedObjectsValidationMap | (() => SavedObjectsValidationMap);
    defaultVersion: string;
  });
  validate(document: SavedObjectSanitizedDoc): void;
}
