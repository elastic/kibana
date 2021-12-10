/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ValidationError, isConfigSchema } from '@kbn/config-schema';
import { createSavedObjectSanitizedDocSchema } from './schema';
import { SavedObjectsValidationMap, SavedObjectsValidationFunction } from './types';
import { SavedObjectsValidationError } from './validator_error';
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

    this.log.debug(`Validating object of type [${this.type}] against version [${objectVersion}]`);
    const validationSchema = createSavedObjectSanitizedDocSchema(validationRule);
    validationSchema.validate(data);

    if (!isConfigSchema(validationRule) && isValidationFunction(validationRule)) {
      this.validateFunction(data, validationRule);
    }
  }

  private validateFunction(
    data: SavedObjectSanitizedDoc,
    validateFn: SavedObjectsValidationFunction
  ) {
    try {
      validateFn({ attributes: data.attributes });
    } catch (err) {
      throw new ValidationError(new SavedObjectsValidationError(err));
    }
  }
}

function isValidationFunction(fn: unknown): fn is SavedObjectsValidationFunction {
  return typeof fn === 'function';
}
