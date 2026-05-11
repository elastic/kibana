/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createDuplicateTitleValidator } from './duplicate_title_validator';

describe('createDuplicateTitleValidator', () => {
  it('bails (returns undefined) when called without an id', async () => {
    const findCurrentTitle = jest.fn();
    const checkForDuplicate = jest.fn();

    const validator = createDuplicateTitleValidator({ findCurrentTitle, checkForDuplicate });

    await expect(validator.fn('any', '')).resolves.toBeUndefined();
    expect(findCurrentTitle).not.toHaveBeenCalled();
    expect(checkForDuplicate).not.toHaveBeenCalled();
  });

  it('bails when `findCurrentTitle` returns `undefined` (item missing or in error state)', async () => {
    const findCurrentTitle = jest.fn().mockResolvedValue(undefined);
    const checkForDuplicate = jest.fn();

    const validator = createDuplicateTitleValidator({ findCurrentTitle, checkForDuplicate });

    await expect(validator.fn('new-title', 'id-1')).resolves.toBeUndefined();
    expect(checkForDuplicate).not.toHaveBeenCalled();
  });

  it('returns the default warning string when `checkForDuplicate` resolves to `false`', async () => {
    const findCurrentTitle = jest.fn().mockResolvedValue('Existing');
    const checkForDuplicate = jest.fn().mockResolvedValue(false);

    const validator = createDuplicateTitleValidator({ findCurrentTitle, checkForDuplicate });

    await expect(validator.fn('Duplicate', 'id-1')).resolves.toBe(
      'Saving "Duplicate" creates a duplicate title.'
    );
    expect(checkForDuplicate).toHaveBeenCalledWith({
      id: 'id-1',
      title: 'Duplicate',
      lastSavedTitle: 'Existing',
    });
  });

  it('returns the formatted warning when `checkForDuplicate` throws (alternative idiom)', async () => {
    const findCurrentTitle = jest.fn().mockResolvedValue('Existing');
    const checkForDuplicate = jest.fn().mockRejectedValue(new Error('boom'));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const validator = createDuplicateTitleValidator({
        findCurrentTitle,
        checkForDuplicate,
        getDuplicateTitleWarning: (value) => `BAD: ${value}`,
      });

      await expect(validator.fn('Duplicate', 'id-1')).resolves.toBe('BAD: Duplicate');

      // Without an error message on the throw, still falls back to the formatter.
      const validator2 = createDuplicateTitleValidator({
        findCurrentTitle,
        checkForDuplicate: jest.fn().mockRejectedValue({}),
        getDuplicateTitleWarning: (value) => `BAD: ${value}`,
      });
      await expect(validator2.fn('Duplicate', 'id-1')).resolves.toBe('BAD: Duplicate');
      expect(warnSpy).toHaveBeenCalledTimes(2);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('returns undefined when the title is unique (`checkForDuplicate` resolves true or void)', async () => {
    const findCurrentTitle = jest.fn().mockResolvedValue('Existing');

    const okTrue = createDuplicateTitleValidator({
      findCurrentTitle,
      checkForDuplicate: jest.fn().mockResolvedValue(true),
    });
    await expect(okTrue.fn('Unique', 'id-1')).resolves.toBeUndefined();

    const okVoid = createDuplicateTitleValidator({
      findCurrentTitle,
      checkForDuplicate: jest.fn().mockResolvedValue(undefined),
    });
    await expect(okVoid.fn('Unique', 'id-1')).resolves.toBeUndefined();
  });
});
