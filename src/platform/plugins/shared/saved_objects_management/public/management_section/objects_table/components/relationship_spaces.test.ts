/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import type { SavedObjectRelation } from '../../../types';
import {
  isStaleRelation,
  getRelationshipHref,
  shouldShowSpacesColumn,
} from './relationship_spaces';

const createRelation = (namespaces?: string[]): SavedObjectRelation => ({
  id: 'related-id',
  type: 'dashboard',
  relationship: 'parent',
  meta: {},
  managed: false,
  references: [],
  namespaces,
});

describe('isStaleRelation', () => {
  it('is not stale when either side has no namespaces', () => {
    expect(isStaleRelation(undefined, ['space-a'])).toBe(false);
    expect(isStaleRelation(['space-a'], undefined)).toBe(false);
  });

  it('is not stale when either side is shared to all spaces', () => {
    expect(isStaleRelation(['*'], ['space-a'])).toBe(false);
    expect(isStaleRelation(['space-a'], ['*'])).toBe(false);
  });

  it('is not stale when the namespaces overlap', () => {
    expect(isStaleRelation(['space-a', 'space-b'], ['space-b'])).toBe(false);
  });

  it('is stale when the namespaces do not overlap', () => {
    expect(isStaleRelation(['space-b'], ['space-a'])).toBe(true);
  });
});

describe('getRelationshipHref', () => {
  it('links to the current space when the relation has no namespaces', () => {
    const basePath = httpServiceMock.createBasePath({ serverBasePath: '' });
    basePath.get.mockReturnValue('/s/space-a');

    expect(getRelationshipHref(basePath, undefined, '/app/dashboard#/1')).toBe(
      '/s/space-a/app/dashboard#/1'
    );
  });

  it('links to the current space when the relation is shared into it', () => {
    const basePath = httpServiceMock.createBasePath({ serverBasePath: '' });
    basePath.get.mockReturnValue('/s/space-a');

    expect(getRelationshipHref(basePath, ['space-a', 'space-b'], '/app/dashboard#/1')).toBe(
      '/s/space-a/app/dashboard#/1'
    );
  });

  it("links to the relation's own space when it is not the current one", () => {
    const basePath = httpServiceMock.createBasePath({ serverBasePath: '' });
    basePath.get.mockReturnValue('/s/space-a');

    expect(getRelationshipHref(basePath, ['space-b'], '/app/dashboard#/1')).toBe(
      '/s/space-b/app/dashboard#/1'
    );
  });

  it('falls back to the current space when the relation is shared to all spaces', () => {
    const basePath = httpServiceMock.createBasePath({ serverBasePath: '' });
    basePath.get.mockReturnValue('/s/space-a');

    expect(getRelationshipHref(basePath, ['*'], '/app/dashboard#/1')).toBe(
      '/s/space-a/app/dashboard#/1'
    );
  });
});

describe('shouldShowSpacesColumn', () => {
  const basePath = httpServiceMock.createBasePath({ serverBasePath: '' });
  basePath.get.mockReturnValue('/s/space-a');

  it('is false when the spaces plugin is not available', () => {
    expect(shouldShowSpacesColumn(undefined, [createRelation(['space-b'])], basePath)).toBe(false);
  });

  it('is false when every relation is only in the current space', () => {
    const spacesApi = spacesPluginMock.createStartContract();
    expect(shouldShowSpacesColumn(spacesApi, [createRelation(['space-a'])], basePath)).toBe(false);
  });

  it('is true when a relation lives in a different space', () => {
    const spacesApi = spacesPluginMock.createStartContract();
    expect(shouldShowSpacesColumn(spacesApi, [createRelation(['space-b'])], basePath)).toBe(true);
  });

  it('is true when a relation is shared to all spaces', () => {
    const spacesApi = spacesPluginMock.createStartContract();
    expect(shouldShowSpacesColumn(spacesApi, [createRelation(['*'])], basePath)).toBe(true);
  });
});
