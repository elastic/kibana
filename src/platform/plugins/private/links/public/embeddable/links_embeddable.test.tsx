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
import { getLinksEmbeddableFactory } from './links_embeddable';
import type { LinksEmbeddableState } from '../../common';
import { LINKS_EMBEDDABLE_TYPE } from '../../common';
import type { Link } from '../../server';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import type { LinksApi, LinksParentApi, ResolvedLink } from '../types';
import { linksClient } from '../content_management';
import { getMockLinksParentApi } from '../mocks';

const getLinks = (): Link[] => [
  {
    id: '001',
    order: 0,
    type: 'dashboardLink',
    label: '',
    destination: '999',
  },
  {
    id: '002',
    order: 1,
    type: 'dashboardLink',
    label: 'Dashboard 2',
    destination: '888',
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

jest.mock('../lib/resolve_links', () => {
  return {
    serializeResolvedLinks: (resolvedLinks: ResolvedLink[]) => {
      return resolvedLinks.map(({ title, description, error, ...linkToSave }) => linkToSave);
    },
    resolveLinks: jest.fn().mockResolvedValue(getResolvedLinks()),
  };
});

jest.mock('../content_management', () => {
  return {
    linksClient: {
      create: jest.fn().mockResolvedValue({ item: { id: '333' } }),
      update: jest.fn().mockResolvedValue({ item: { id: '123' } }),
    },
  };
});

jest.mock('../content_management/load_from_library', () => {
  return {
    loadFromLibrary: jest.fn((savedObjectId) => {
      return Promise.resolve({
        title: 'links 001',
        description: 'some links',
        links: getLinks(),
        layout: 'vertical',
      });
    }),
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
      <EmbeddableRenderer<LinksEmbeddableState, LinksApi>
        type={LINKS_EMBEDDABLE_TYPE}
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
    embeddable.registerReactEmbeddableFactory(LINKS_EMBEDDABLE_TYPE, async () => {
      return factory;
    });
    setStubKibanaServices();
  });

  describe('by reference embeddable', () => {
    const parent = getMockLinksParentApi({
      title: 'my links',
      description: 'just a few links',
      hidePanelTitles: false,
      savedObjectId: '123',
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
            savedObjectId: '123',
          },
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
            links: getLinks(),
            layout: 'vertical',
          },
        });
      });
    });
  });

  describe('by value embeddable', () => {
    const parent = getMockLinksParentApi({
      description: 'just a few links',
      title: 'my links',
      hidePanelTitles: true,
      links: getLinks(),
      layout: 'horizontal',
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
            links: getLinks(),
            layout: 'horizontal',
          },
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
        });
        expect(newId).toBe('333');
        expect(api.getSerializedStateByReference(newId)).toEqual({
          rawState: {
            title: 'my links',
            description: 'just a few links',
            hidePanelTitles: true,
            savedObjectId: '333',
          },
        });
      });
    });
  });
});
