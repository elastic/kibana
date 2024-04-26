/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { buildMockDashboard } from '@kbn/dashboard-plugin/public/mocks';
import { setStubKibanaServices } from '@kbn/presentation-panel-plugin/public/mocks';
import { getLinksEmbeddableFactory } from './links_embeddable';
import { Link } from '../../common/content_management';
import { CONTENT_ID } from '../../common';
import {
  ReactEmbeddableFactory,
  ReactEmbeddableRenderer,
  registerReactEmbeddableFactory,
} from '@kbn/embeddable-plugin/public';
import { LinksApi, LinksSerializedState, ResolvedLink } from './types';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';
import { linksClient } from '../content_management';

const links: Link[] = [
  {
    id: '001',
    order: 0,
    type: 'dashboardLink',
    label: 'Dashboard 1',
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

const resolvedLinks: ResolvedLink[] = [
  {
    id: '001',
    order: 0,
    type: 'dashboardLink',
    label: 'Dashboard 1',
    destinationRefName: 'link_001_dashboard',
    title: 'Dashboard 1',
    description: 'Dashboard 1 description',
  },
  {
    id: '002',
    order: 1,
    type: 'dashboardLink',
    label: 'Dashboard 2',
    destinationRefName: 'link_002_dashboard',
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

const expectedRuntimeState = {
  attributes: {
    layout: 'horizontal',
    links: [
      {
        destination: '999',
        id: '001',
        order: 0,
        type: 'dashboardLink',
        label: 'Dashboard 1',
      },
      {
        destination: '888',
        id: '002',
        order: 1,
        type: 'dashboardLink',
        label: 'Dashboard 2',
      },
      {
        destination: 'https://example.com',
        id: '003',
        order: 2,
        type: 'externalLink',
        label: 'Example homepage',
      },
      {
        destination: 'https://elastic.co',
        id: '004',
        order: 3,
        type: 'externalLink',
      },
    ],
    description: 'just a few links',
    title: 'my links',
  },
};

jest.mock('../content_management', () => {
  return {
    linksClient: {
      create: jest.fn().mockResolvedValue({ item: { id: '333' } }),
    },
  };
});

jest.mock('./utils', () => {
  return {
    resolveLinks: jest.fn().mockResolvedValue(resolvedLinks),
  };
});

jest.mock('../content_management/load_from_library', () => {
  return {
    loadFromLibrary: jest.fn((savedObjectId) => {
      return Promise.resolve({
        attributes: {
          title: 'links 001',
          description: 'some links',
          links,
          layout: 'vertical',
        },
        metaInfo: {
          sharingSavedObjectProps: {
            aliasTargetId: '123',
            outcome: 'exactMatch',
            aliasPurpose: 'sharing',
            sourceId: savedObjectId,
          },
        },
      });
    }),
  };
});

describe('getLinksEmbeddableFactory', () => {
  let parent: DashboardContainer;
  let factory: ReactEmbeddableFactory<LinksSerializedState, LinksApi>;

  beforeAll(() => {
    setStubKibanaServices();
    parent = buildMockDashboard();
    factory = getLinksEmbeddableFactory();
    registerReactEmbeddableFactory(CONTENT_ID, async () => {
      return factory;
    });
  });

  describe('by reference embeddable', () => {
    const rawState = {
      savedObjectId: '123',
      title: 'my links',
      description: 'just a few links',
    } as LinksSerializedState;

    test('deserializeState', () => {
      const deserializedState = factory.deserializeState({
        rawState,
        references,
      });
      expect(deserializedState).toEqual({
        savedObjectId: '123',
        title: 'my links',
        description: 'just a few links',
      });
    });

    test('component renders', async () => {
      render(
        <ReactEmbeddableRenderer<LinksSerializedState, LinksApi>
          type={CONTENT_ID}
          state={{
            rawState,
            references,
          }}
          parentApi={parent}
        />
      );

      expect(await screen.findByTestId('links--component')).toBeInTheDocument();
    });

    test('api methods', async () => {
      const onApiAvailable = jest.fn() as jest.MockedFunction<(api: LinksApi) => void>;

      render(
        <ReactEmbeddableRenderer<LinksSerializedState, LinksApi>
          type={CONTENT_ID}
          state={{
            rawState,
            references,
          }}
          onApiAvailable={onApiAvailable}
          parentApi={parent}
        />
      );

      await waitFor(() => {
        const api = onApiAvailable.mock.calls[0][0];
        expect(api.serializeState()).toEqual({
          rawState: {
            savedObjectId: '123',
            title: 'my links',
            description: 'just a few links',
            hidePanelTitles: undefined,
          },
          references: [],
        });
        expect(api.getByValueState()).toEqual({
          attributes: { links, layout: 'vertical', title: 'links 001', description: 'some links' },
          title: 'my links',
          description: 'just a few links',
          hidePanelTitles: undefined,
        });
        expect(api.getByReferenceState('321')).toEqual({
          savedObjectId: '321',
          title: 'my links',
          description: 'just a few links',
          hidePanelTitles: undefined,
        });
        expect(api.canLinkToLibrary()).resolves.toBe(false);
        expect(api.canUnlinkFromLibrary()).resolves.toBe(true);
        expect(api.resolvedLinks$.value).toEqual(resolvedLinks);
        expect(api.attributes$.value).toEqual({
          title: 'links 001',
          description: 'some links',
          links,
          layout: 'vertical',
        });
        expect(api.savedObjectId$.value).toBe('123');
        expect(api.defaultPanelTitle!.value).toBe('links 001');
        expect(api.defaultPanelDescription!.value).toBe('some links');
      });
    });
  });

  describe('by value embeddable', () => {
    const rawState = {
      attributes: {
        links,
        layout: 'horizontal',
        title: 'my links',
        description: 'just a few links',
      },
    } as LinksSerializedState;

    test('deserializeState', () => {
      const deserializedState = factory.deserializeState({
        rawState,
        references,
      });
      expect(deserializedState).toEqual(expectedRuntimeState);
    });

    test('component renders', async () => {
      render(
        <ReactEmbeddableRenderer<LinksSerializedState, LinksApi>
          type={CONTENT_ID}
          state={{
            rawState,
            references,
          }}
          parentApi={parent}
        />
      );

      expect(await screen.findByTestId('links--component')).toBeInTheDocument();
    });

    test('api methods', async () => {
      const onApiAvailable = jest.fn() as jest.MockedFunction<(api: LinksApi) => void>;

      render(
        <ReactEmbeddableRenderer<LinksSerializedState, LinksApi>
          type={CONTENT_ID}
          state={{
            rawState,
            references,
          }}
          onApiAvailable={onApiAvailable}
          parentApi={parent}
        />
      );

      await waitFor(async () => {
        const api = onApiAvailable.mock.calls[0][0];
        expect(api.serializeState()).toEqual({
          rawState: {
            attributes: {
              title: 'my links',
              description: 'just a few links',
              links,
              layout: 'horizontal',
            },
          },
          references,
        });
        expect(await api.canLinkToLibrary()).toBe(true);
        expect(await api.canUnlinkFromLibrary()).toBe(false);
        expect(api.resolvedLinks$.value).toEqual(resolvedLinks);
        expect(api.attributes$.value).toEqual(expectedRuntimeState.attributes);
        expect(api.savedObjectId$.value).toBeUndefined();

        const newId = await api.saveToLibrary('some new title');
        expect(linksClient.create).toHaveBeenCalledWith({
          data: {
            title: 'some new title',
            description: 'just a few links',
            links,
            layout: 'horizontal',
          },
          options: { references },
        });
        expect(newId).toBe('333');
      });
    });
  });
});
