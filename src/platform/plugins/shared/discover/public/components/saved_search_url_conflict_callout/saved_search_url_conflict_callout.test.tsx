/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { History } from 'history';

import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import { SavedSearchURLConflictCallout } from './saved_search_url_conflict_callout';

import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';

describe('SavedSearchURLConflictCallout', () => {
  let spaces: ReturnType<typeof spacesPluginMock.createStartContract>;
  let history: History;

  beforeEach(() => {
    spaces = spacesPluginMock.createStartContract();
    spaces.ui.components.getLegacyUrlConflict = jest.fn().mockReturnValue('callout');
    history = {
      location: {
        search: '?_g=foo',
      },
    } as History;
  });

  test("should render URLConflictCallout in case of id's conflicts", () => {
    const discoverSession = {
      id: 'id',
      title: 'Shared session',
      sharingSavedObjectProps: {
        outcome: 'conflict',
        aliasTargetId: 'aliasTargetId',
      },
    } as DiscoverSession;

    renderWithI18n(
      <SavedSearchURLConflictCallout
        spaces={spaces}
        discoverSession={discoverSession}
        history={history}
      />
    );

    expect(spaces.ui.components.getLegacyUrlConflict).toHaveBeenCalledWith({
      currentObjectId: 'id',
      objectNoun: "'Shared session' Discover session",
      otherObjectId: 'aliasTargetId',
      otherObjectPath: '#/view/aliasTargetId?_g=foo',
    });
    expect(screen.getByText('callout')).toBeVisible();
  });

  test('should not render URLConflictCallout in case of no conflicts', () => {
    const discoverSession = {
      id: 'id',
      sharingSavedObjectProps: {},
    } as DiscoverSession;

    renderWithI18n(
      <SavedSearchURLConflictCallout
        spaces={spaces}
        discoverSession={discoverSession}
        history={history}
      />
    );

    expect(spaces.ui.components.getLegacyUrlConflict).not.toHaveBeenCalled();
    expect(screen.queryByText('callout')).not.toBeInTheDocument();
  });
});
