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

  test('useTopNavLinks result', () => {
    const topNavLinks = renderHook(
      () =>
        useTopNavLinks({
          dataView: dataViewMock,
          onOpenInspector: jest.fn(),
          services,
          state,
          isEsqlMode: false,
          adHocDataViews: [],
          topNavCustomization: undefined,
          shouldShowESQLToDataViewTransitionModal: false,
        }),
      {
        wrapper: Wrapper,
      }
    ).result.current;
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

  test('useTopNavLinks result for ES|QL mode', () => {
    const topNavLinks = renderHook(
      () =>
        useTopNavLinks({
          dataView: dataViewMock,
          onOpenInspector: jest.fn(),
          services,
          state,
          isEsqlMode: true,
          adHocDataViews: [],
          topNavCustomization: undefined,
          shouldShowESQLToDataViewTransitionModal: false,
        }),
      {
        wrapper: Wrapper,
      }
    ).result.current;
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

  describe('useTopNavLinks with share service included', () => {
    beforeAll(() => {
      services.share = sharePluginMock.createStartContract();
    });

    afterAll(() => {
      services.share = undefined;
    });

    it('will include share menu item if the share service is available', () => {
      const topNavLinks = renderHook(
        () =>
          useTopNavLinks({
            dataView: dataViewMock,
            onOpenInspector: jest.fn(),
            services,
            state,
            isEsqlMode: false,
            adHocDataViews: [],
            topNavCustomization: undefined,
            shouldShowESQLToDataViewTransitionModal: false,
          }),
        {
          wrapper: Wrapper,
        }
      ).result.current;
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

    it('will include export menu item if there are export integrations available', () => {
      const availableIntegrationsSpy = jest.spyOn(services.share!, 'availableIntegrations');

      availableIntegrationsSpy.mockImplementation((_objectType, groupId) => {
        if (groupId === 'export') {
          return [
            {
              id: 'export',
              shareType: 'integration',
              groupId: 'export',
              config: () => ({}),
            },
          ];
        }

        return [];
      });

      const topNavLinks = renderHook(
        () =>
          useTopNavLinks({
            dataView: dataViewMock,
            onOpenInspector: jest.fn(),
            services,
            state,
            isEsqlMode: false,
            adHocDataViews: [],
            topNavCustomization: undefined,
            shouldShowESQLToDataViewTransitionModal: false,
          }),
        {
          wrapper: Wrapper,
        }
      ).result.current;
      expect(topNavLinks.filter((obj) => obj.id === 'export')).toBeDefined();
    });
  });
});
