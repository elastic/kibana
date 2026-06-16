/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import { showSavedObject } from './show_saved_object';

describe('showSavedObject', () => {
  it('should return true if the first tab is not a text based query', () => {
    const savedObject = {
      attributes: {
        tabs: [{ attributes: { isTextBasedQuery: false } }],
      },
    } as unknown as SavedObjectCommon;
    expect(showSavedObject(savedObject)).toBe(true);
  });

  it('should return false if the first tab is a text based query', () => {
    const savedObject = {
      attributes: {
        tabs: [{ attributes: { isTextBasedQuery: true } }],
      },
    } as unknown as SavedObjectCommon;
    expect(showSavedObject(savedObject)).toBe(false);
  });

  it('should return true if the first tab is not of an adhoc data view', () => {
    const savedObject = {
      attributes: {
        tabs: [{ attributes: { usesAdHocDataView: false } }],
      },
    } as unknown as SavedObjectCommon;
    expect(showSavedObject(savedObject)).toBe(true);
  });

  it('should return false if the first tab is of an adhoc data view', () => {
    const savedObject = {
      attributes: {
        tabs: [{ attributes: { usesAdHocDataView: true } }],
      },
    } as unknown as SavedObjectCommon;
    expect(showSavedObject(savedObject)).toBe(false);
  });

  it('should ignore legacy root-level fields and use the first tab instead', () => {
    const savedObject = {
      attributes: {
        isTextBasedQuery: false,
        usesAdHocDataView: false,
        tabs: [{ attributes: { isTextBasedQuery: true, usesAdHocDataView: false } }],
      },
    } as unknown as SavedObjectCommon;

    expect(showSavedObject(savedObject)).toBe(false);
  });
});
