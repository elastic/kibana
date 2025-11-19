/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { useTopNavLinks } from './use_top_nav_links';
import type { DiscoverServices } from '../../../../build_services';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { DiscoverTestProvider } from '../../../../__mocks__/test_provider';

describe('useTopNavLinks', () => {
  const services = {
    ...createDiscoverServicesMock(),
    capabilities: {
      discover_v2: {
        save: true,
      },
    },
    uiSettings: {
      get: jest.fn(() => true),
    },
  } as unknown as DiscoverServices;

  const state = getDiscoverStateMock({ isTimeBased: true });
  state.actions.setDataView(dataViewMock);

  // identifier to denote if share integration is available,
  // we default to false especially that there a specific test scenario for when this is true
  const hasShareIntegration = false;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
      <DiscoverTestProvider
        services={services}
        stateContainer={state}
        runtimeState={{
          currentDataView: dataViewMock,
          adHocDataViews: [],
        }}
      >
        {children}
      </DiscoverTestProvider>
    );
  };

  const setup = (hookAttrs: Partial<Parameters<typeof useTopNavLinks>[0]> = {}) => {
    return renderHook(
      () =>
        useTopNavLinks({
          dataView: dataViewMock,
          onOpenInspector: jest.fn(),
          services,
          state,
          hasUnsavedChanges: false,
          isEsqlMode: false,
          adHocDataViews: [],
          topNavCustomization: undefined,
          shouldShowESQLToDataViewTransitionModal: false,
          hasShareIntegration,
          persistedDiscoverSession: undefined,
          ...hookAttrs,
        }),
      {
        wrapper: Wrapper,
      }
    ).result.current;
  };

  it('should return results', () => {
    const topNavLinks = setup();

    expect(topNavLinks).toMatchInlineSnapshot(`
      Array [
        Object {
          "color": "text",
          "emphasize": true,
          "fill": false,
          "id": "esql",
          "label": "Try ES|QL",
          "run": [Function],
          "testId": "select-text-based-language-btn",
          "tooltip": "ES|QL is Elastic's powerful new piped query language.",
        },
        Object {
          "description": "Open Inspector for search",
          "id": "inspect",
          "label": "Inspect",
          "run": [Function],
          "testId": "openInspectorButton",
        },
        Object {
          "description": "New session",
          "iconOnly": true,
          "iconType": "plus",
          "id": "new",
          "label": "New session",
          "run": [Function],
          "testId": "discoverNewButton",
        },
        Object {
          "description": "Open session",
          "iconOnly": true,
          "iconType": "folderOpen",
          "id": "open",
          "label": "Open session",
          "run": [Function],
          "testId": "discoverOpenButton",
        },
        Object {
          "description": "Save session",
          "emphasize": true,
          "iconType": "save",
          "id": "save",
          "label": "Save",
          "run": [Function],
          "testId": "discoverSaveButton",
        },
      ]
    `);
  });

  describe('when ES|QL mode is true', () => {
    it('should return results', () => {
      const topNavLinks = setup({
        isEsqlMode: true,
      });

      expect(topNavLinks).toMatchInlineSnapshot(`
        Array [
          Object {
            "color": "text",
            "emphasize": true,
            "fill": false,
            "id": "esql",
            "label": "Switch to classic",
            "run": [Function],
            "testId": "switch-to-dataviews",
            "tooltip": "Switch to KQL or Lucene syntax.",
          },
          Object {
            "description": "Open Inspector for search",
            "id": "inspect",
            "label": "Inspect",
            "run": [Function],
            "testId": "openInspectorButton",
          },
          Object {
            "description": "New session",
            "iconOnly": true,
            "iconType": "plus",
            "id": "new",
            "label": "New session",
            "run": [Function],
            "testId": "discoverNewButton",
          },
          Object {
            "description": "Open session",
            "iconOnly": true,
            "iconType": "folderOpen",
            "id": "open",
            "label": "Open session",
            "run": [Function],
            "testId": "discoverOpenButton",
          },
          Object {
            "description": "Save session",
            "emphasize": true,
            "iconType": "save",
            "id": "save",
            "label": "Save",
            "run": [Function],
            "testId": "discoverSaveButton",
          },
        ]
      `);
    });
  });

  describe('when share service included', () => {
    beforeAll(() => {
      services.share = sharePluginMock.createStartContract();
    });

    afterAll(() => {
      services.share = undefined;
    });

    it('should include the share menu item', () => {
      const topNavLinks = setup();

      expect(topNavLinks).toMatchInlineSnapshot(`
        Array [
          Object {
            "color": "text",
            "emphasize": true,
            "fill": false,
            "id": "esql",
            "label": "Try ES|QL",
            "run": [Function],
            "testId": "select-text-based-language-btn",
            "tooltip": "ES|QL is Elastic's powerful new piped query language.",
          },
          Object {
            "description": "Open Inspector for search",
            "id": "inspect",
            "label": "Inspect",
            "run": [Function],
            "testId": "openInspectorButton",
          },
          Object {
            "description": "New session",
            "iconOnly": true,
            "iconType": "plus",
            "id": "new",
            "label": "New session",
            "run": [Function],
            "testId": "discoverNewButton",
          },
          Object {
            "description": "Open session",
            "iconOnly": true,
            "iconType": "folderOpen",
            "id": "open",
            "label": "Open session",
            "run": [Function],
            "testId": "discoverOpenButton",
          },
          Object {
            "description": "Share Discover session",
            "iconOnly": true,
            "iconType": "share",
            "id": "share",
            "label": "Share",
            "run": [Function],
            "testId": "shareTopNavButton",
          },
          Object {
            "description": "Save session",
            "emphasize": true,
            "iconType": "save",
            "id": "save",
            "label": "Save",
            "run": [Function],
            "testId": "discoverSaveButton",
          },
        ]
      `);
    });

    it('should include the export menu item', () => {
      const topNavLinks = renderHook(
        () =>
          useTopNavLinks({
            dataView: dataViewMock,
            onOpenInspector: jest.fn(),
            services,
            state,
            hasUnsavedChanges: false,
            isEsqlMode: false,
            adHocDataViews: [],
            topNavCustomization: undefined,
            shouldShowESQLToDataViewTransitionModal: false,
            hasShareIntegration: true,
            persistedDiscoverSession: undefined,
          }),
        {
          wrapper: Wrapper,
        }
      ).result.current;
      expect(topNavLinks.filter((obj) => obj.id === 'export')).toBeDefined();
    });
  });

  describe('when background search is enabled', () => {
    beforeEach(() => {
      services.data.search.isBackgroundSearchEnabled = true;
    });

    afterEach(() => {
      services.data.search.isBackgroundSearchEnabled = false;
    });

    it('should return the background search menu item', () => {
      const topNavLinks = setup();

      expect(topNavLinks.filter((obj) => obj.id === 'backgroundSearch')).toBeDefined();
    });
  });

  describe('when background search is disabled', () => {
    it('should NOT return the background search menu item', () => {
      const topNavLinks = setup();

      expect(topNavLinks.filter((obj) => obj.id === 'backgroundSearch')).toHaveLength(0);
    });
  });
});
