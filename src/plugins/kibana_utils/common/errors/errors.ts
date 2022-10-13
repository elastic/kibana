/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable max-classes-per-file */

// abstract error class
export class KbnError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * when a mapping already exists for a field the user is attempting to add
 * @param {String} name - the field name
 */
export class DuplicateField extends KbnError {
  constructor(name: string) {
    super(`The field "${name}" already exists in this mapping`);
  }
}

/**
 * when a user is attempting to create a field with disallowed character in the name, like *
 * @param {String} character - the character not allowed in name
 * @param {String} name - the field name
 */
export class CharacterNotAllowedInField extends KbnError {
  constructor(character: string, name: string) {
    super(`The field "${name}" cannot have "${character}" in the name`);
  }
}

/**
 * A saved object was not found
 */
export class SavedObjectNotFound extends KbnError {
  public savedObjectType: string;
  public savedObjectId?: string;
  constructor(type: string, id?: string, link?: string, customMessage?: string) {
    const idMsg = id ? ` (id: ${id})` : '';
    let message = `Could not locate that ${type}${idMsg}`;

    if (link) {
      message += `, [click here to re-create it](${link})`;
    }

    super(customMessage || message);

    this.savedObjectType = type;
    this.savedObjectId = id;
  }
}

/**
 * A saved field doesn't exist anymore
 */
export class SavedFieldNotFound extends KbnError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * A saved field type isn't compatible with aggregation
 */
export class SavedFieldTypeInvalidForAgg extends KbnError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * This error is for scenarios where a saved object is detected that has invalid JSON properties.
 * There was a scenario where we were importing objects with double-encoded JSON, and the system
 * was silently failing. This error is now thrown in those scenarios.
 */
export class InvalidJSONProperty extends KbnError {
  constructor(message: string) {
    super(message);
  }
}
