/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { DuplicateField, SavedObjectNotFound, KbnError } from './errors';

describe('errors', () => {
  const errors = [new DuplicateField('dupfield'), new SavedObjectNotFound('dashboard', '123')];

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
