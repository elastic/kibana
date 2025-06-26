/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SimpleSavedObject } from '@kbn/core/public';
import type { FinderAttributes } from '@kbn/saved-objects-finder-plugin/common';
import { showSavedObject } from './show_saved_object';

describe('showSavedObject', () => {
  it('should return true if the saved object is not a text based query', () => {
    const savedObject = {
      attributes: { isTextBasedQuery: false },
    };
    expect(showSavedObject(savedObject as unknown as SimpleSavedObject<FinderAttributes>)).toBe(
      true
    );
  });

  it('should return false if the saved object is a text based query', () => {
    const savedObject = {
      attributes: { isTextBasedQuery: true },
    };
    expect(showSavedObject(savedObject as unknown as SimpleSavedObject<FinderAttributes>)).toBe(
      false
    );
  });

  it('should return true if the saved object is not of an adhoc data view', () => {
    const savedObject = {
      attributes: { usesAdHocDataView: false },
    };
    expect(showSavedObject(savedObject as unknown as SimpleSavedObject<FinderAttributes>)).toBe(
      true
    );
  });

  it('should return false if the saved object is of an adhoc data view', () => {
    const savedObject = {
      attributes: { usesAdHocDataView: true },
    };
    expect(showSavedObject(savedObject as unknown as SimpleSavedObject<FinderAttributes>)).toBe(
      false
    );
  });
});
