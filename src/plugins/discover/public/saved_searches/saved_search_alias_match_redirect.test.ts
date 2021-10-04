/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useSavedSearchAliasMatchRedirect } from './saved_search_alias_match_redirect';
import type { SavedSearch } from './types';

import { spacesPluginMock } from '../../../../../x-pack/plugins/spaces/public/mocks';

describe('useSavedSearchAliasMatchRedirect', () => {
  let spaces: ReturnType<typeof spacesPluginMock.createStartContract>;

  beforeEach(() => {
    spaces = spacesPluginMock.createStartContract();
  });

  test("should render URLConflictCallout in case of id's conflicts", () => {
    const savedSearch = {
      id: 'id',
      sharingSavedObject: {
        outcome: 'aliasMatch',
        aliasTargetId: 'aliasTargetId',
      },
    } as SavedSearch;

    renderHook(() => useSavedSearchAliasMatchRedirect({ spaces, savedSearch }));

    expect(spaces.ui.redirectLegacyUrl).toHaveBeenCalledWith('#/view/aliasTargetId', ' search');
  });

  test('should not render URLConflictCallout if outcome !== aliasMatch', () => {
    const savedSearch = {
      id: 'id',
      sharingSavedObject: {
        outcome: 'exactMatch',
      },
    } as SavedSearch;

    renderHook(() => useSavedSearchAliasMatchRedirect({ spaces, savedSearch }));

    expect(spaces.ui.redirectLegacyUrl).not.toHaveBeenCalled();
  });

  test('should not render URLConflictCallout if aliasTargetId is not defined', () => {
    const savedSearch = {
      id: 'id',
      sharingSavedObject: {
        outcome: 'aliasMatch',
      },
    } as SavedSearch;

    renderHook(() => useSavedSearchAliasMatchRedirect({ spaces, savedSearch }));

    expect(spaces.ui.redirectLegacyUrl).not.toHaveBeenCalled();
  });
});
