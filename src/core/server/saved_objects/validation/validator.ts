/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createSavedObjectSanitizedDocSchema } from './schema';
import { SavedObjectsValidationMap } from './types';
import { SavedObjectSanitizedDoc } from '../serialization';
import { Logger } from '../../logging';

/**
 * Helper class that takes a {@link SavedObjectsValidationMap} and runs validations for a
 * given type based on the provided Kibana version.
 *
 * @internal
 */
export class SavedObjectsTypeValidator {
  private readonly log: Logger;
  private readonly type: string;
  private readonly validationMap: SavedObjectsValidationMap;

  constructor({
    logger,
    type,
    validationMap,
  }: {
    logger: Logger;
    type: string;
    validationMap: SavedObjectsValidationMap | (() => SavedObjectsValidationMap);
  }) {
    this.log = logger;
    this.type = type;
    this.validationMap = typeof validationMap === 'function' ? validationMap() : validationMap;
  }

  public validate(objectVersion: string, data: SavedObjectSanitizedDoc): void {
    const validationRule = this.validationMap[objectVersion];
    if (!validationRule) {
      return; // no matching validation rule could be found; proceed without validating
    }

    try {
      const validationSchema = createSavedObjectSanitizedDocSchema(validationRule);
      validationSchema.validate(data);
    } catch (e) {
      this.log.warn(
        `Error validating object of type [${this.type}] against version [${objectVersion}]`
      );
      throw e;
    }
  }
}
