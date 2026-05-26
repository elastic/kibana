/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen, waitFor } from '@testing-library/react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { Query } from '@kbn/es-query';
import { canShowSavedQuery } from '../search_bar/lib/can_show_saved_query';
import type { QueryBarMenuProps } from './query_bar_menu';
import { QueryBarMenu } from './query_bar_menu';

/**
 * End-to-end binding of `application.capabilities.savedQueryManagement.*` to the
 * popover affordances rendered by `<QueryBarMenu>`. After the FTR-to-Scout migration
 * the API spec confirms the capabilities payload, but only this test confirms
 * the popover renders the right affordances.
 * Production wiring (`search_bar.tsx`):
 *   showSaveQuery = canShowSavedQuery({ allowSavingQueries, query, core })
 * Each case below mirrors that wiring so the test fails if either side drifts
 * (the helper changes, or `<QueryBarMenu>` stops gating on `showQueries`).
 */

interface SavedQueryCapabilities {
  showQueries: boolean;
  saveQuery: boolean;
  // CoreStart types capabilities as `Record<string, boolean | Record<string, boolean>>`
  // so we need an index signature for this nested capability to be assignable.
  [key: string]: boolean;
}

interface AffordancesAssertion {
  loadButton: 'visible' | 'absent';
  saveButton: 'enabled' | 'disabled' | 'absent';
}

interface PrivilegeCase {
  label: string;
  capabilities: SavedQueryCapabilities;
  expected: AffordancesAssertion;
}

const KQL_QUERY: Query = { query: '', language: 'kuery' };

const CASES: readonly PrivilegeCase[] = [
  {
    label:
      'savedQueryManagement.{showQueries:true, saveQuery:true} renders both buttons; save disabled until a query exists',
    capabilities: { showQueries: true, saveQuery: true },
    expected: { loadButton: 'visible', saveButton: 'disabled' },
  },
  {
    label:
      'savedQueryManagement.{showQueries:true, saveQuery:false} renders load, renders save but disabled',
    capabilities: { showQueries: true, saveQuery: false },
    expected: { loadButton: 'visible', saveButton: 'disabled' },
  },
  {
    label:
      'savedQueryManagement.{showQueries:false, saveQuery:false} hides the entire saved-queries section',
    capabilities: { showQueries: false, saveQuery: false },
    expected: { loadButton: 'absent', saveButton: 'absent' },
  },
  {
    label:
      'savedQueryManagement.{showQueries:false, saveQuery:true} still hides the section — showQueries gates everything',
    capabilities: { showQueries: false, saveQuery: true },
    expected: { loadButton: 'absent', saveButton: 'absent' },
  },
];

describe('QueryBarMenu — capability-driven popover affordances', () => {
  const startMock = coreMock.createStart();
  const dataMock = dataPluginMock.createStartContract();

  const createMockStorage = () => {
    const storage = {
      clear: jest.fn(),
      getItem: jest.fn(),
      key: jest.fn(),
      removeItem: jest.fn(),
      setItem: jest.fn(),
      length: 0,
    };
    return {
      storage,
      get: jest.fn().mockReturnValue('kuery'),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    };
  };

  function renderMenuWithCapabilities(capabilities: SavedQueryCapabilities) {
    const core = {
      ...startMock,
      application: {
        ...startMock.application,
        capabilities: {
          ...startMock.application.capabilities,
          savedQueryManagement: capabilities,
        },
      },
    };
    // Mirror the production derivation in `search_bar.tsx`: `showSaveQuery` is
    // computed via `canShowSavedQuery`. Keeping this derivation inside the test
    // is what makes the assertion span both layers of the contract chain.
    const showSaveQuery = canShowSavedQuery({
      allowSavingQueries: true,
      query: KQL_QUERY,
      core,
    });

    const services = {
      application: core.application,
      data: dataMock,
      storage: createMockStorage(),
      uiSettings: startMock.uiSettings,
    };

    const props: QueryBarMenuProps = {
      language: 'kuery',
      onQueryChange: jest.fn(),
      onCloseFilterPopover: jest.fn(),
      onLocalFilterUpdate: jest.fn(),
      onLocalFilterCreate: jest.fn(),
      onQueryBarSubmit: jest.fn(),
      toggleFilterBarMenuPopover: jest.fn(),
      openQueryBarMenu: true,
      // showQueryInput + showFilterBar must both be true for the saved-queries
      // section to even be evaluated; gating it on capabilities is the contract
      // under test here.
      showQueryInput: true,
      showFilterBar: true,
      showSaveQuery,
      savedQueryService: {
        ...dataMock.query.savedQueries,
        // Return one query so the load button is enabled when it does render —
        // we want to assert it's *present*, not bisect with the "no saved
        // queries" disabled path which is already covered elsewhere.
        getSavedQueryCount: jest.fn().mockResolvedValue(1),
      },
      additionalQueryBarMenuItems: {},
      queryBarMenuRef: React.createRef(),
    };

    return render(
      <I18nProvider>
        <KibanaContextProvider services={services}>
          <QueryBarMenu {...props} />
        </KibanaContextProvider>
      </I18nProvider>
    );
  }

  async function assertAffordances(expected: AffordancesAssertion) {
    // Wait until the panel renders before introspecting items; with
    // `showQueries=false` the section never appears, so we wait on the panel
    // itself (always present when popover is open) and then assert.
    await waitFor(() => {
      expect(screen.getByTestId('queryBarMenuPanel')).toBeInTheDocument();
    });

    const loadButton = screen.queryByTestId('saved-query-management-load-button');
    const saveButton = screen.queryByTestId('saved-query-management-save-button');

    if (expected.loadButton === 'absent') {
      // When the section is gated off, the async saved-queries count effect
      // never fires, so we have nothing to wait on beyond the initial render.
      expect(loadButton).not.toBeInTheDocument();
    } else {
      // `useQueryBarMenuPanels` fetches the saved-queries count asynchronously;
      // the load button enabled-state flips once that resolves, so wait on it.
      await waitFor(() => {
        expect(screen.getByTestId('saved-query-management-load-button')).toBeInTheDocument();
      });
    }

    if (expected.saveButton === 'absent') {
      expect(saveButton).not.toBeInTheDocument();
    } else if (expected.saveButton === 'enabled') {
      expect(saveButton).toBeInTheDocument();
      expect(saveButton).toBeEnabled();
    } else {
      expect(saveButton).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    }
  }

  it.each(CASES)('$label', async ({ capabilities, expected }) => {
    renderMenuWithCapabilities(capabilities);
    await assertAffordances(expected);
  });
});
