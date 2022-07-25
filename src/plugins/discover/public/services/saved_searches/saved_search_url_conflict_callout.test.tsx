/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { History } from 'history';

import { mountWithIntl } from '@kbn/test-jest-helpers';
import { SavedSearchURLConflictCallout } from './saved_search_url_conflict_callout';
import type { SavedSearch } from './types';

import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';

describe('SavedSearchURLConflictCallout', () => {
  let spaces: ReturnType<typeof spacesPluginMock.createStartContract>;
  let history: () => History;

  beforeEach(() => {
    spaces = spacesPluginMock.createStartContract();
    spaces.ui.components.getLegacyUrlConflict = jest.fn().mockReturnValue('callout');
    history = () =>
      ({
        location: {
          search: '?_g=foo',
        },
      } as History);
  });

  test("should render URLConflictCallout in case of id's conflicts", () => {
    const savedSearch = {
      id: 'id',
      sharingSavedObjectProps: {
        outcome: 'conflict',
        aliasTargetId: 'aliasTargetId',
      },
    } as SavedSearch;

    const component = mountWithIntl(
      <SavedSearchURLConflictCallout spaces={spaces} savedSearch={savedSearch} history={history} />
    );

    expect(component.children()).toMatchInlineSnapshot(`"callout"`);
  });

  test('should not render URLConflictCallout in case of no conflicts', () => {
    const savedSearch = {
      id: 'id',
      sharingSavedObjectProps: {},
    } as SavedSearch;

    const component = mountWithIntl(
      <SavedSearchURLConflictCallout spaces={spaces} savedSearch={savedSearch} history={history} />
    );

    expect(component.children()).toMatchInlineSnapshot(`null`);
  });
});
