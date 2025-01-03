/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DocLinks } from '@kbn/doc-links';

export const mockPackage = new Proxy({ raw: {} as any }, { get: (obj, prop) => obj.raw[prop] });
import type { applyDeprecations } from './deprecation/apply_deprecations';

jest.mock('../../../package.json', () => mockPackage);

const changedPaths = {
  set: ['foo'],
  unset: ['bar.baz'],
};

export { changedPaths as mockedChangedPaths };

export const mockApplyDeprecations = jest.fn<
  ReturnType<typeof applyDeprecations>,
  Parameters<typeof applyDeprecations>
>((config, deprecations, createAddDeprecation) => ({ config, changedPaths }));

jest.mock('./deprecation/apply_deprecations', () => ({
  applyDeprecations: mockApplyDeprecations,
}));

export const docLinksMock = {
  settings: 'settings',
} as DocLinks;
export const getDocLinksMock = jest.fn().mockReturnValue(docLinksMock);

jest.doMock('@kbn/doc-links', () => ({
  getDocLinks: getDocLinksMock,
}));
