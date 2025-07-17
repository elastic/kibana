/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { setStubKibanaServices } from '@kbn/presentation-panel-plugin/public/mocks';
import { EuiThemeProvider } from '@elastic/eui';
import { deserializeState, getLinksEmbeddableFactory } from './links_embeddable';
import { Link } from '../../common/content_management';
import { CONTENT_ID } from '../../common';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import {
  LinksApi,
  LinksByReferenceSerializedState,
  LinksByValueSerializedState,
  LinksParentApi,
  LinksSerializedState,
  ResolvedLink,
} from '../types';
import { linksClient } from '../content_management';
import { getMockLinksParentApi } from '../mocks';

const getLinks: () => Link[] = () => [
  {
    id: '001',
    order: 0,
    type: 'dashboardLink',
    label: '',
    destinationRefName: 'link_001_dashboard',
  },
  {
    id: '002',
    order: 1,
    type: 'dashboardLink',
    label: 'Dashboard 2',
    destinationRefName: 'link_002_dashboard',
  },
  {
    id: '003',
    order: 2,
    type: 'externalLink',
    label: 'Example homepage',
    destination: 'https://example.com',
  },
  {
    id: '004',
    order: 3,
    type: 'externalLink',
    destination: 'https://elastic.co',
  },
];

const getResolvedLinks: () => ResolvedLink[] = () => [
  {
    id: '001',
    order: 0,
    type: 'dashboardLink',
    label: '',
    destination: '999',
    title: 'Dashboard 1',
    description: 'Dashboard 1 description',
  },
  {
    id: '002',
    order: 1,
    type: 'dashboardLink',
    label: 'Dashboard 2',
    destination: '888',
    title: 'Dashboard 2',
    description: 'Dashboard 2 description',
  },
  {
    id: '003',
    order: 2,
    type: 'externalLink',
    label: 'Example homepage',
    destination: 'https://example.com',
    title: 'Example homepage',
  },
  {
    id: '004',
    order: 3,
    type: 'externalLink',
    destination: 'https://elastic.co',
    title: 'https://elastic.co',
  },
];

const references = [
  {
    id: '999',
    name: 'link_001_dashboard',
    type: 'dashboard',
  },
  {
    id: '888',
    name: 'link_002_dashboard',
    type: 'dashboard',
  },
];

jest.mock('../lib/resolve_links', () => {
  return {
    resolveLinks: jest.fn().mockResolvedValue(getResolvedLinks()),
  };
});

jest.mock('../content_management', () => {
  return {
    linksClient: {
      create: jest.fn().mockResolvedValue({ item: { id: '333' } }),
      update: jest.fn().mockResolvedValue({ item: { id: '123' } }),
      get: jest.fn((savedObjectId) => {
        return Promise.resolve({
          item: {
            id: savedObjectId,
            attributes: {
              title: 'links 001',
              description: 'some links',
              links: getLinks(),
              layout: 'vertical',
            },
            references,
          },
          meta: {
            aliasTargetId: '123',
            outcome: 'exactMatch',
            aliasPurpose: 'sharing',
            sourceId: savedObjectId,
          },
        });
      }),
    },
  };
});

const renderEmbeddable = (
  parent: LinksParentApi,
  overrides?: {
    onApiAvailable: (api: LinksApi) => void;
  }
) => {
  return render(
    <EuiThemeProvider>
      <EmbeddableRenderer<LinksSerializedState, LinksApi>
        type={CONTENT_ID}
        onApiAvailable={jest.fn()}
        getParentApi={jest.fn().mockReturnValue(parent)}
        {...overrides}
      />
    </EuiThemeProvider>
  );
};

describe('getLinksEmbeddableFactory', () => {
  const factory = getLinksEmbeddableFactory();

  beforeAll(() => {
    const embeddable = embeddablePluginMock.createSetupContract();
    embeddable.registerReactEmbeddableFactory(CONTENT_ID, async () => {
      return factory;
    });
    setStubKibanaServices();
  });

  describe('by reference embeddable', () => {
    const byRefState = {
      rawState: {
        title: 'my links',
        description: 'just a few links',
        hidePanelTitles: false,
      } as LinksByReferenceSerializedState,
      references: [
        {
          id: '123',
          name: 'savedObjectRef',
          type: 'links',
        },
      ],
    };

    const expectedRuntimeState = {
      defaultTitle: 'links 001',
      defaultDescription: 'some links',
      layout: 'vertical',
      links: getResolvedLinks(),
      description: 'just a few links',
      title: 'my links',
      savedObjectId: '123',
      hidePanelTitles: false,
    };

    const parent = getMockLinksParentApi(byRefState.rawState, byRefState.references);

    test('deserializeState', async () => {
      const deserializedState = await deserializeState(byRefState);
      expect(deserializedState).toEqual({
        ...expectedRuntimeState,
      });
    });

    test('component renders', async () => {
      renderEmbeddable(parent);
      expect(await screen.findByTestId('links--component')).toBeInTheDocument();
    });

    test('api methods', async () => {
      const onApiAvailable = jest.fn() as jest.MockedFunction<(api: LinksApi) => void>;
      renderEmbeddable(parent, { onApiAvailable });

      await waitFor(async () => {
        const api = onApiAvailable.mock.calls[0][0];
        expect(api.serializeState()).toEqual({
          rawState: {
            title: 'my links',
            description: 'just a few links',
            hidePanelTitles: false,
          },
          references: [
            {
              id: '123',
              name: 'savedObjectRef',
              type: 'links',
            },
          ],
        });
        expect(await api.canUnlinkFromLibrary()).toBe(true);
        expect(api.defaultTitle$?.value).toBe('links 001');
        expect(api.defaultDescription$?.value).toBe('some links');
      });
    });

    test('unlink from library', async () => {
      const onApiAvailable = jest.fn() as jest.MockedFunction<(api: LinksApi) => void>;
      renderEmbeddable(parent, { onApiAvailable });

      await waitFor(async () => {
        const api = onApiAvailable.mock.calls[0][0];
        expect(api.getSerializedStateByValue()).toEqual({
          rawState: {
            title: 'my links',
            description: 'just a few links',
            hidePanelTitles: false,
            attributes: {
              description: 'some links',
              title: 'links 001',
              links: getLinks(),
              layout: 'vertical',
            },
          },
          references,
        });
      });
    });
  });

  describe('by value embeddable', () => {
    const byValueState = {
      rawState: {
        attributes: {
          links: getLinks(),
          layout: 'horizontal',
        },
        description: 'just a few links',
        title: 'my links',
        hidePanelTitles: true,
      } as LinksByValueSerializedState,
      references,
    };

    const expectedRuntimeState = {
      defaultTitle: undefined,
      defaultDescription: undefined,
      layout: 'horizontal',
      links: getResolvedLinks(),
      description: 'just a few links',
      title: 'my links',
      savedObjectId: undefined,
      hidePanelTitles: true,
    };

    const parent = getMockLinksParentApi(byValueState.rawState, byValueState.references);

    test('deserializeState', async () => {
      const deserializedState = await deserializeState(byValueState);
      expect(deserializedState).toEqual({ ...expectedRuntimeState, layout: 'horizontal' });
    });

    test('component renders', async () => {
      renderEmbeddable(parent);

      expect(await screen.findByTestId('links--component')).toBeInTheDocument();
    });

    test('api methods', async () => {
      const onApiAvailable = jest.fn() as jest.MockedFunction<(api: LinksApi) => void>;
      renderEmbeddable(parent, { onApiAvailable });

      await waitFor(async () => {
        const api = onApiAvailable.mock.calls[0][0];
        expect(api.serializeState()).toEqual({
          rawState: {
            title: 'my links',
            description: 'just a few links',
            hidePanelTitles: true,
            attributes: {
              links: getLinks(),
              layout: 'horizontal',
            },
          },
          references,
        });

        expect(await api.canLinkToLibrary()).toBe(true);
      });
    });
    test('save to library', async () => {
      const onApiAvailable = jest.fn() as jest.MockedFunction<(api: LinksApi) => void>;
      renderEmbeddable(parent, { onApiAvailable });

      await waitFor(async () => {
        const api = onApiAvailable.mock.calls[0][0];
        const newId = await api.saveToLibrary('some new title');
        expect(linksClient.create).toHaveBeenCalledWith({
          data: {
            title: 'some new title',
            links: getLinks(),
            layout: 'horizontal',
          },
          options: { references },
        });
        expect(newId).toBe('333');
        expect(api.getSerializedStateByReference(newId)).toEqual({
          rawState: {
            title: 'my links',
            description: 'just a few links',
            hidePanelTitles: true,
          },
          references: [
            {
              id: '333',
              name: 'savedObjectRef',
              type: 'links',
            },
          ],
        });
      });
    });
  });
});
