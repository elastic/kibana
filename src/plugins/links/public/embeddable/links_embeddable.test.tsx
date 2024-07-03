/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { setStubKibanaServices } from '@kbn/presentation-panel-plugin/public/mocks';
import { getLinksEmbeddableFactory } from './links_embeddable';
import { Link } from '../../common/content_management';
import { CONTENT_ID } from '../../common';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import {
  LinksApi,
  LinksParentApi,
  LinksRuntimeState,
  LinksSerializedState,
  ResolvedLink,
} from '../types';
import { linksClient } from '../content_management';
import { getMockLinksParentApi } from '../mocks';

const links: Link[] = [
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

const resolvedLinks: ResolvedLink[] = [
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
    resolveLinks: jest.fn().mockResolvedValue(resolvedLinks),
  };
});

jest.mock('../content_management', () => {
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
    linksClient: {
      create: jest.fn().mockResolvedValue({ item: { id: '333' } }),
      update: jest.fn().mockResolvedValue({ item: { id: '123' } }),
    },
  };
});

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
    const rawState = {
      savedObjectId: '123',
      title: 'my links',
      description: 'just a few links',
    } as LinksSerializedState;

    const expectedRuntimeState = {
      defaultPanelTitle: 'links 001',
      defaultPanelDescription: 'some links',
      layout: 'vertical',
      links: resolvedLinks,
      description: 'just a few links',
      title: 'my links',
      savedObjectId: '123',
    };

    let parent: LinksParentApi;

    beforeEach(() => {
      parent = getMockLinksParentApi(rawState, references);
    });

    test('deserializeState', async () => {
      const deserializedState = await factory.deserializeState({
        rawState,
        references,
      });
      expect(deserializedState).toEqual({
        ...expectedRuntimeState,
      });
    });

    test('component renders', async () => {
      render(
        <ReactEmbeddableRenderer<LinksSerializedState, LinksApi>
          type={CONTENT_ID}
          getParentApi={() => parent}
        />
      );

      expect(await screen.findByTestId('links--component')).toBeInTheDocument();
    });

    test('api methods', async () => {
      const onApiAvailable = jest.fn() as jest.MockedFunction<(api: LinksApi) => void>;

      render(
        <ReactEmbeddableRenderer<LinksSerializedState, LinksRuntimeState, LinksApi>
          type={CONTENT_ID}
          onApiAvailable={onApiAvailable}
          getParentApi={() => parent}
        />
      );

      await waitFor(async () => {
        const api = onApiAvailable.mock.calls[0][0];
        expect(await api.serializeState()).toEqual({
          rawState: {
            savedObjectId: '123',
            title: 'my links',
            description: 'just a few links',
            hidePanelTitles: undefined,
          },
          references: [],
        });
        expect(api.libraryId$.value).toBe('123');
        expect(api.defaultPanelTitle!.value).toBe('links 001');
        expect(api.defaultPanelDescription!.value).toBe('some links');
      });
    });

    test('unlink from library', async () => {
      const onApiAvailable = jest.fn() as jest.MockedFunction<(api: LinksApi) => void>;

      render(
        <ReactEmbeddableRenderer<LinksSerializedState, LinksRuntimeState, LinksApi>
          type={CONTENT_ID}
          onApiAvailable={onApiAvailable}
          getParentApi={() => parent}
        />
      );

      await waitFor(async () => {
        const api = onApiAvailable.mock.calls[0][0];
        api.unlinkFromLibrary();
        expect(await api.serializeState()).toEqual({
          rawState: {
            title: 'my links',
            description: 'just a few links',
            hidePanelTitles: undefined,
            attributes: {
              description: 'some links',
              title: 'links 001',
              links,
              layout: 'vertical',
            },
          },
          references,
        });
        expect(api.libraryId$.value).toBeUndefined();
      });
    });
  });

  describe('by value embeddable', () => {
    const rawState = {
      attributes: {
        links,
        layout: 'horizontal',
      },
      description: 'just a few links',
      title: 'my links',
    } as LinksSerializedState;

    const expectedRuntimeState = {
      defaultPanelTitle: undefined,
      defaultPanelDescription: undefined,
      layout: 'horizontal',
      links: resolvedLinks,
      description: 'just a few links',
      title: 'my links',
      savedObjectId: undefined,
    };

    let parent: LinksParentApi;

    beforeEach(() => {
      parent = getMockLinksParentApi(rawState, references);
    });

    test('deserializeState', async () => {
      const deserializedState = await factory.deserializeState({
        rawState,
        references,
      });
      expect(deserializedState).toEqual({ ...expectedRuntimeState, layout: 'horizontal' });
    });

    test('component renders', async () => {
      render(
        <ReactEmbeddableRenderer<LinksSerializedState, LinksApi>
          type={CONTENT_ID}
          getParentApi={() => parent}
        />
      );

      expect(await screen.findByTestId('links--component')).toBeInTheDocument();
    });

    test('api methods', async () => {
      const onApiAvailable = jest.fn() as jest.MockedFunction<(api: LinksApi) => void>;

      render(
        <ReactEmbeddableRenderer<LinksSerializedState, LinksRuntimeState, LinksApi>
          type={CONTENT_ID}
          onApiAvailable={onApiAvailable}
          getParentApi={() => parent}
        />
      );

      await waitFor(async () => {
        const api = onApiAvailable.mock.calls[0][0];
        expect(await api.serializeState()).toEqual({
          rawState: {
            title: 'my links',
            description: 'just a few links',
            hidePanelTitles: undefined,
            attributes: {
              links,
              layout: 'horizontal',
            },
          },
          references,
        });

        expect(api.libraryId$.value).toBeUndefined();
      });
    });
    test('save to library', async () => {
      const onApiAvailable = jest.fn() as jest.MockedFunction<(api: LinksApi) => void>;

      render(
        <ReactEmbeddableRenderer<LinksSerializedState, LinksRuntimeState, LinksApi>
          type={CONTENT_ID}
          onApiAvailable={onApiAvailable}
          getParentApi={() => parent}
        />
      );

      await waitFor(async () => {
        const api = onApiAvailable.mock.calls[0][0];
        const newId = await api.saveToLibrary('some new title');
        expect(linksClient.create).toHaveBeenCalledWith({
          data: {
            title: 'some new title',
            links,
            layout: 'horizontal',
          },
          options: { references },
        });
        expect(newId).toBe('333');
        expect(api.libraryId$.value).toBe('333');
        expect(await api.serializeState()).toEqual({
          rawState: {
            savedObjectId: '333',
            title: 'my links',
            description: 'just a few links',
            hidePanelTitles: undefined,
          },
          references: [],
        });
      });
    });
  });
});
