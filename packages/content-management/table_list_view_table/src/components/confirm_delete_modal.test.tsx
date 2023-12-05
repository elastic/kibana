/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import { registerTestBed, TestBed } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';

import { ConfirmDeleteModal } from './confirm_delete_modal';
import type { Props as ConfirmDeleteModalProps } from './confirm_delete_modal';

describe('<ConfirmDeleteModal />', () => {
  let testBed: TestBed;
  const spacesApi = spacesPluginMock.createStartContract();

  const defaultProps: ConfirmDeleteModalProps = {
    isDeletingItems: false,
    items: [
      {
        id: '1',
        type: 'type1',
        attributes: {
          title: 'foo',
          description: 'foo',
        },
        namespaces: ['default', 'space-1', 'space-2'],
        references: [],
        updatedAt: '',
      },
      {
        id: '2',
        type: 'type2',
        attributes: {
          title: 'bar',
          description: 'bar',
        },
        namespaces: ['default', 'space-1'],
        references: [],
        updatedAt: '',
      },
      {
        id: '3',
        type: 'type3',
        attributes: {
          title: 'baz',
          description: 'baz',
        },
        namespaces: ['*'],
        references: [],
        updatedAt: '',
      },
    ],
    entityName: 'foo',
    entityNamePlural: 'foos',
    onCancel: jest.fn(),
    onConfirm: jest.fn(),
    spacesApi,
  };

  const setup = registerTestBed(ConfirmDeleteModal, {
    memoryRouter: { wrapComponent: false },
    defaultProps,
  });

  test('renders the Spaces column when spacesApi is available', async () => {
    await act(async () => {
      testBed = await setup();
    });

    const { component, exists, table } = testBed!;
    component.update();
    const { tableCellsValues } = table.getMetaData('itemsInDeleteConfirmTable');
    const [row1, row2, row3] = tableCellsValues;
    expect(row1[1]).toBe('3');
    expect(row2[1]).toBe('2');
    expect(row3[1]).toBe('all');
    expect(exists('sharedItemsInDeleteConfirmCallout')).toBe(true);
  });

  test('does not render the Spaces column when spacesApi is not available', async () => {
    await act(async () => {
      testBed = await setup({ spacesApi: undefined });
    });

    const { component, exists, table } = testBed!;
    component.update();
    const { tableCellsValues } = table.getMetaData('itemsInDeleteConfirmTable');
    const [row1, row2, row3] = tableCellsValues;
    expect(row1[0]).toBe('foo');
    expect(row2[0]).toBe('bar');
    expect(row3[0]).toBe('baz');
    expect(row1[1]).toBeUndefined();
    expect(row2[1]).toBeUndefined();
    expect(row3[1]).toBeUndefined();
    expect(exists('sharedItemsInDeleteConfirmCallout')).toBe(false);
  });

  test('does not render the Spaces column when spacesApi.hasOnlyDefaultSpace is true', async () => {
    await act(async () => {
      testBed = await setup({ spacesApi: { ...spacesApi, hasOnlyDefaultSpace: true } });
    });

    const { component, exists, table } = testBed!;
    component.update();
    const { tableCellsValues } = table.getMetaData('itemsInDeleteConfirmTable');
    const [row1, row2, row3] = tableCellsValues;
    expect(row1[0]).toBe('foo');
    expect(row2[0]).toBe('bar');
    expect(row3[0]).toBe('baz');
    expect(row1[1]).toBeUndefined();
    expect(row2[1]).toBeUndefined();
    expect(row3[1]).toBeUndefined();
    expect(exists('sharedItemsInDeleteConfirmCallout')).toBe(false);
  });

  test('does not render the shared items callout when all items have only one namespace', async () => {
    await act(async () => {
      testBed = await setup({
        items: [
          {
            id: '1',
            type: 'type1',
            attributes: {
              title: 'bizz',
              description: 'bizz',
            },
            namespaces: ['default'],
            references: [],
            updatedAt: '',
          },
          {
            id: '2',
            type: 'type2',
            attributes: {
              title: 'fuzz',
              description: 'fuzz',
            },
            namespaces: ['default'],
            references: [],
            updatedAt: '',
          },
        ],
      });
    });

    const { component, exists, table } = testBed!;
    component.update();
    const { tableCellsValues } = table.getMetaData('itemsInDeleteConfirmTable');
    const [row1, row2] = tableCellsValues;
    expect(row1[0]).toBe('bizz');
    expect(row2[0]).toBe('fuzz');
    expect(row1[1]).toBe('1');
    expect(row2[1]).toBe('1');
    expect(exists('sharedItemsInDeleteConfirmCallout')).toBe(false);
  });
});
