/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook } from '@testing-library/react-hooks';
import type { History } from 'history';

import { useSavedSearchAliasMatchRedirect } from './saved_search_alias_match_redirect';
import type { SavedSearch } from '../../../common/types';

import { spacesPluginMock } from '../../../../../../x-pack/plugins/spaces/public/mocks';

describe('useSavedSearchAliasMatchRedirect', () => {
  let spaces: ReturnType<typeof spacesPluginMock.createStartContract>;
  let history: () => History;

  beforeEach(() => {
    spaces = spacesPluginMock.createStartContract();
    history = () =>
      ({
        location: {
          search: '?_g=foo',
        },
      } as History);
  });

  test('should redirect in case of aliasMatch', () => {
    const savedSearch = {
      id: 'id',
      title: 'my-title',
      sharingSavedObjectProps: {
        outcome: 'aliasMatch',
        aliasTargetId: 'aliasTargetId',
        aliasPurpose: 'savedObjectConversion',
      },
    } as SavedSearch;

    renderHook(() => useSavedSearchAliasMatchRedirect({ spaces, savedSearch, history }));

    expect(spaces.ui.redirectLegacyUrl).toHaveBeenCalledWith({
      path: '#/view/aliasTargetId?_g=foo',
      aliasPurpose: 'savedObjectConversion',
      objectNoun: 'my-title search',
    });
  });

  test('should not redirect if outcome !== aliasMatch', () => {
    const savedSearch = {
      id: 'id',
      sharingSavedObjectProps: {
        outcome: 'exactMatch',
      },
    } as SavedSearch;

    renderHook(() => useSavedSearchAliasMatchRedirect({ spaces, savedSearch, history }));

    expect(spaces.ui.redirectLegacyUrl).not.toHaveBeenCalled();
  });

  test('should not redirect if aliasTargetId is not defined', () => {
    const savedSearch = {
      id: 'id',
      sharingSavedObjectProps: {
        outcome: 'aliasMatch',
      },
    } as SavedSearch;

    renderHook(() => useSavedSearchAliasMatchRedirect({ spaces, savedSearch, history }));

    expect(spaces.ui.redirectLegacyUrl).not.toHaveBeenCalled();
  });
});
