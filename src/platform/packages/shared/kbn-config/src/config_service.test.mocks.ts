/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import type { DocLinks } from '@kbn/doc-links';

export const mockPackage = new Proxy({ raw: {} as any }, { get: (obj, prop) => obj.raw[prop] });
import type { applyDeprecations } from './deprecation/apply_deprecations';

vi.mock('../../../../../../package.json', () => mockPackage);

const changedPaths = {
  set: ['foo'],
  unset: ['bar.baz'],
};

export { changedPaths as mockedChangedPaths };

export const mockApplyDeprecations = vi.fn<
  (...args: Parameters<typeof applyDeprecations>) => ReturnType<typeof applyDeprecations>
>((config, deprecations, createAddDeprecation) => ({ config, changedPaths }));

vi.mock('./deprecation/apply_deprecations', () => {
  const mocked = {
    applyDeprecations: mockApplyDeprecations,
  };
  return { ...mocked, default: mocked };
});

export const docLinksMock = {
  settings: 'settings',
} as DocLinks;
export const getDocLinksMock = vi.fn().mockReturnValue(docLinksMock);

vi.doMock('@kbn/doc-links', () => {
  const mocked = {
    getDocLinks: getDocLinksMock,
  };
  return { ...mocked, default: mocked };
});
