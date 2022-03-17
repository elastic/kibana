/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import {
  DuplicateField,
  SavedObjectNotFound,
  KbnError,
  isSavedObjectNotFoundError,
} from './errors';

const errors = [new DuplicateField('dupfield'), new SavedObjectNotFound('dashboard', '123')];

describe('errors', () => {
  errors.forEach((error) => {
    const className = error.constructor.name;
    it(`${className} has a message`, () => {
      expect(error.message).to.not.be.empty();
    });

    it(`${className} has a stack trace`, () => {
      expect(error.stack).to.not.be.empty();
    });

    it(`${className} is an instance of KbnError`, () => {
      expect(error instanceof KbnError).to.be(true);
    });
  });
});

describe('isSavedObjectNotFoundError', () => {
  it(`returns false if passed 'undefined'`, () => {
    expect(isSavedObjectNotFoundError(undefined)).to.be(false);
  });

  it('returns false if passed an Error other than SavedObjectNotFound', () => {
    expect(isSavedObjectNotFoundError(errors[0])).to.be(false);
  });

  it('returns true if passed a SavedObjectNotFound error', () => {
    expect(isSavedObjectNotFoundError(errors[1])).to.be(true);
  });

  it('returns true if passed a specialization of SavedObjectNotFound error', () => {
    class SpecializedError extends SavedObjectNotFound {}
    expect(isSavedObjectNotFoundError(new SpecializedError('dashboard', '123'))).to.be(true);
  });
});
