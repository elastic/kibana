/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { getLinksEmbeddableFactory } from './links_embeddable';
import type { LinksEmbeddableState } from '../../common';
import { LINKS_EMBEDDABLE_TYPE } from '../../common';
import type { Link } from '../../server';
import type { LinksApi, ResolvedLink } from '../types';
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

async function buildLinksEmbeddable(state: LinksEmbeddableState) {
  const factory = getLinksEmbeddableFactory();
  const parentApi = getMockLinksParentApi(state);
  const uuid = '1234';
  return await factory.buildEmbeddable({
    initialState: state,
    finalizeApi: (api) => {
      return {
        ...api,
        uuid,
        parentApi,
        type: LINKS_EMBEDDABLE_TYPE,
      } as LinksApi;
    },
    parentApi,
    uuid,
  });
}

describe('getLinksEmbeddableFactory', () => {
  describe('by reference embeddable', () => {
    const byRefState: LinksEmbeddableState = {
      title: 'my links',
      description: 'just a few links',
      hide_title: false,
      savedObjectId: '123',
    };

    test('component renders', async () => {
      const { Component } = await buildLinksEmbeddable(byRefState);
      render(
        <EuiThemeProvider>
          <Component />
        </EuiThemeProvider>
      );
      expect(await screen.findByTestId('links--component')).toBeInTheDocument();
    });

    test('api methods', async () => {
      const { api } = await buildLinksEmbeddable(byRefState);
      expect(api.serializeState()).toEqual({
        title: 'my links',
        description: 'just a few links',
        hide_title: false,
        savedObjectId: '123',
      });
      expect(await api.canUnlinkFromLibrary()).toBe(true);
      expect(api.defaultTitle$?.value).toBe('links 001');
      expect(api.defaultDescription$?.value).toBe('some links');
    });

    test('unlink from library', async () => {
      const { api } = await buildLinksEmbeddable(byRefState);
      expect(api.getSerializedStateByValue()).toEqual({
        title: 'my links',
        description: 'just a few links',
        hide_title: false,
        links: getLinks(),
        layout: 'vertical',
      });
    });
  });

  describe('by value embeddable', () => {
    const byValueState: LinksEmbeddableState = {
      description: 'just a few links',
      title: 'my links',
      hide_title: true,
      links: getLinks(),
      layout: 'horizontal',
    };

    test('component renders', async () => {
      const { Component } = await buildLinksEmbeddable(byValueState);
      render(
        <EuiThemeProvider>
          <Component />
        </EuiThemeProvider>
      );

      expect(await screen.findByTestId('links--component')).toBeInTheDocument();
    });

    test('api methods', async () => {
      const { api } = await buildLinksEmbeddable(byValueState);
      expect(api.serializeState()).toEqual({
        title: 'my links',
        description: 'just a few links',
        hide_title: true,
        links: getLinks(),
        layout: 'horizontal',
      });

      expect(await api.canLinkToLibrary()).toBe(true);
    });

    test('save to library', async () => {
      const { api } = await buildLinksEmbeddable(byValueState);
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
        title: 'my links',
        description: 'just a few links',
        hide_title: true,
        savedObjectId: '333',
      });
    });
  });
});
