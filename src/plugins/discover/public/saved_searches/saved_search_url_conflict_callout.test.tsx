/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { SavedSearchURLConflictCallout } from './saved_search_url_conflict_callout';
import type { SavedSearch } from './types';

import { spacesPluginMock } from '../../../../../x-pack/plugins/spaces/public/mocks';

describe('SavedSearchURLConflictCallout', () => {
  let spaces: ReturnType<typeof spacesPluginMock.createStartContract>;

  beforeEach(() => {
    spaces = spacesPluginMock.createStartContract();
    spaces.ui.components.getLegacyUrlConflict = jest.fn().mockReturnValue('callout');
  });

  test("should render URLConflictCallout in case of id's conflicts", () => {
    const savedSearch = {
      id: 'id',
      sharingSavedObject: {
        outcome: 'conflict',
        aliasTargetId: 'aliasTargetId',
      },
    } as SavedSearch;

    const component = mountWithIntl(
      <SavedSearchURLConflictCallout spaces={spaces} savedSearch={savedSearch} />
    );

    expect(component.children()).toMatchInlineSnapshot(`"callout"`);
  });

  test('should not render URLConflictCallout in case of no conflicts', () => {
    const savedSearch = {
      id: 'id',
      sharingSavedObject: {},
    } as SavedSearch;

    const component = mountWithIntl(
      <SavedSearchURLConflictCallout spaces={spaces} savedSearch={savedSearch} />
    );

    expect(component.children()).toMatchInlineSnapshot(`null`);
  });
});
