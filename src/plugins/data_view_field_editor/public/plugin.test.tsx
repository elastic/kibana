/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { registerTestBed } from '@kbn/test-jest-helpers';

jest.mock('../../kibana_react/public', () => {
  const original = jest.requireActual('../../kibana_react/public');

  return {
    ...original,
    toMountPoint: (node: React.ReactNode) => node,
  };
});

import { CoreStart } from 'src/core/public';
import { coreMock } from 'src/core/public/mocks';
import { dataPluginMock } from '../../data/public/mocks';
import { fieldFormatsServiceMock } from '../../field_formats/public/mocks';
import { usageCollectionPluginMock } from '../../usage_collection/public/mocks';

import { FieldEditorLoader } from './components/field_editor_loader';
import { IndexPatternFieldEditorPlugin } from './plugin';
import { DeleteFieldModal } from './components/confirm_modals/delete_field_modal';
import { DataView } from './shared_imports';

const noop = () => {};

describe('DataViewFieldEditorPlugin', () => {
  const coreStart: CoreStart = coreMock.createStart();
  const pluginStart = {
    data: dataPluginMock.createStartContract(),
    usageCollection: usageCollectionPluginMock.createSetupContract(),
    dataViews: dataPluginMock.createStartContract().dataViews,
    fieldFormats: fieldFormatsServiceMock.createStartContract(),
  };

  let plugin: IndexPatternFieldEditorPlugin;

  beforeEach(() => {
    plugin = new IndexPatternFieldEditorPlugin();
  });

  test('should expose a handler to open the indexpattern field editor', async () => {
    const startApi = await plugin.start(coreStart, pluginStart);
    expect(startApi.openEditor).toBeDefined();
  });

  test('should call core.overlays.openFlyout when opening the editor', async () => {
    const openFlyout = jest.fn();
    const onSaveSpy = jest.fn();

    const coreStartMocked = {
      ...coreStart,
      overlays: {
        ...coreStart.overlays,
        openFlyout,
      },
    };
    const { openEditor } = await plugin.start(coreStartMocked, pluginStart);

    openEditor({ onSave: onSaveSpy, ctx: { dataView: {} as any } });

    expect(openFlyout).toHaveBeenCalled();

    const [[arg]] = openFlyout.mock.calls;
    expect(arg.props.children.type).toBe(FieldEditorLoader);

    // We force call the "onSave" prop from the <RuntimeFieldEditorFlyoutContent /> component
    // and make sure that the the spy is being called.
    // Note: we are testing implementation details, if we change or rename the "onSave" prop on
    // the component, we will need to update this test accordingly.
    expect(arg.props.children.props.onSave).toBeDefined();
    arg.props.children.props.onSave();
    expect(onSaveSpy).toHaveBeenCalled();
  });

  test('should return a handler to close the flyout', async () => {
    const { openEditor } = await plugin.start(coreStart, pluginStart);

    const closeEditorHandler = openEditor({ onSave: noop, ctx: { dataView: {} as any } });
    expect(typeof closeEditorHandler).toBe('function');
  });

  test('should expose a handler to open field deletion modal', async () => {
    const startApi = await plugin.start(coreStart, pluginStart);
    expect(startApi.openDeleteModal).toBeDefined();
  });

  test('should call correct services when opening the deletion modal', async () => {
    const openModal = jest.fn();
    const onDeleteSpy = jest.fn();
    const removeFieldSpy = jest.fn();

    const coreStartMocked = {
      ...coreStart,
      overlays: {
        ...coreStart.overlays,
        openModal,
      },
    };
    const pluginStartMocked = {
      ...pluginStart,
      data: pluginStart.data,
      dataViews: {
        ...pluginStart.data.indexPatterns,
        updateSavedObject: jest.fn(),
      },
    };
    const { openDeleteModal } = await plugin.start(coreStartMocked, pluginStartMocked);

    const indexPatternMock = { removeRuntimeField: removeFieldSpy } as unknown as DataView;

    openDeleteModal({
      onDelete: onDeleteSpy,
      ctx: { dataView: indexPatternMock },
      fieldName: ['a', 'b', 'c'],
    });

    expect(openModal).toHaveBeenCalled();

    const [[arg]] = openModal.mock.calls;
    expect(arg.type).toBe(DeleteFieldModal);

    // simulate user confirming deletion
    await arg.props.confirmDelete();

    // consumer should be notified
    expect(onDeleteSpy).toHaveBeenCalled();

    // fields should be removed on index pattern and changes persisted
    expect(removeFieldSpy).toHaveBeenCalledWith('a');
    expect(removeFieldSpy).toHaveBeenCalledWith('b');
    expect(removeFieldSpy).toHaveBeenCalledWith('c');
    expect(pluginStartMocked.dataViews.updateSavedObject).toHaveBeenLastCalledWith(
      indexPatternMock
    );
  });

  test('should return a handler to close the modal', async () => {
    const { openDeleteModal } = await plugin.start(coreStart, pluginStart);

    const closeModal = openDeleteModal({ fieldName: ['a'], ctx: { dataView: {} as any } });
    expect(typeof closeModal).toBe('function');
  });

  test('should expose a render props component to delete runtime fields', async () => {
    const { DeleteRuntimeFieldProvider } = await plugin.start(coreStart, pluginStart);

    const TestComponent = ({ callback }: { callback: (...args: any[]) => void }) => {
      return (
        <DeleteRuntimeFieldProvider dataView={{} as any}>
          {(...args) => {
            // Forward arguments passed down to children to our spy callback
            callback(args);
            return null;
          }}
        </DeleteRuntimeFieldProvider>
      );
    };

    const setup = registerTestBed(TestComponent, {
      memoryRouter: { wrapComponent: false },
    });

    const spy = jest.fn();
    // Mount our dummy component and pass it the spy
    setup({ callback: spy });

    expect(spy).toHaveBeenCalled();
    const argumentsFromRenderProps = spy.mock.calls[0][0];

    expect(argumentsFromRenderProps.length).toBe(1);
    expect(typeof argumentsFromRenderProps[0]).toBe('function');
  });
});
