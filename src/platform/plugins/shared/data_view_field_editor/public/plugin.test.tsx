/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, OverlayRef } from '@kbn/core/public';
import type { DataView } from './shared_imports';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { IndexPatternFieldEditorPlugin } from './plugin';
import { render, screen, waitFor } from '@testing-library/react';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/public/mocks';

jest.mock('@kbn/esql-language', () => ({}));

jest.mock('@kbn/react-kibana-mount', () => {
  const original = jest.requireActual('@kbn/react-kibana-mount');

  return {
    ...original,
    toMountPoint: (node: React.ReactNode) => node,
  };
});

jest.mock('./components/field_editor_loader', () => {
  return {
    FieldEditorLoader: ({ onSave }: { onSave: (fields: unknown[]) => void }) => (
      <button type="button" onClick={() => onSave([])}>
        Save field
      </button>
    ),
  };
});

const renderMountPoint = (mountPoint: unknown) => render(mountPoint as React.ReactElement);

describe('DataViewFieldEditorPlugin', () => {
  const coreStart: CoreStart = coreMock.createStart();

  const pluginStart = {
    data: dataPluginMock.createStartContract(),
    dataViews: dataPluginMock.createStartContract().dataViews,
    fieldFormats: fieldFormatsServiceMock.createStartContract(),
    usageCollection: usageCollectionPluginMock.createSetupContract(),
  };

  let plugin: IndexPatternFieldEditorPlugin;

  beforeEach(() => {
    plugin = new IndexPatternFieldEditorPlugin();
  });

  const createCoreStart = (overlays: Partial<CoreStart['overlays']>): CoreStart => ({
    ...coreStart,
    overlays: {
      ...coreStart.overlays,
      ...overlays,
    },
  });

  const createOverlayRef = () => {
    const close = jest.fn().mockResolvedValue(undefined);
    const overlayRef: OverlayRef = { close, onClose: Promise.resolve() };

    return { close, overlayRef };
  };

  const createFlyoutMock = () => {
    const { close, overlayRef } = createOverlayRef();
    const openFlyout = jest.fn<
      ReturnType<CoreStart['overlays']['openFlyout']>,
      Parameters<CoreStart['overlays']['openFlyout']>
    >(() => overlayRef);

    return { closeFlyout: close, openFlyout };
  };

  const createModalMock = () => {
    const { close, overlayRef } = createOverlayRef();
    const openModal = jest.fn<
      ReturnType<CoreStart['overlays']['openModal']>,
      Parameters<CoreStart['overlays']['openModal']>
    >(() => overlayRef);

    return { closeModal: close, openModal };
  };

  it('should expose a handler to open the indexpattern field editor', () => {
    const startApi = plugin.start(coreStart, pluginStart);

    expect(startApi.openEditor).toBeDefined();
  });

  it('should call core.overlays.openFlyout when opening the editor', async () => {
    const user = userEvent.setup();
    const { closeFlyout, openFlyout } = createFlyoutMock();
    const onSaveSpy = jest.fn();

    const { openEditor } = plugin.start(createCoreStart({ openFlyout }), pluginStart);

    await openEditor({ onSave: onSaveSpy, ctx: { dataView: {} as DataView } });

    expect(openFlyout).toHaveBeenCalled();

    const [[flyoutMountPoint]] = openFlyout.mock.calls;
    renderMountPoint(flyoutMountPoint);

    await user.click(screen.getByText('Save field'));

    expect(closeFlyout).toHaveBeenCalled();
    expect(onSaveSpy).toHaveBeenCalledWith([]);
  });

  it('should return a handler to close the flyout', async () => {
    const { openEditor } = plugin.start(coreStart, pluginStart);

    const closeEditorHandler = await openEditor({
      onSave: jest.fn(),
      ctx: { dataView: {} as DataView },
    });
    expect(typeof closeEditorHandler).toBe('function');
  });

  it('should expose a handler to open field deletion modal', () => {
    const startApi = plugin.start(coreStart, pluginStart);

    expect(startApi.openDeleteModal).toBeDefined();
  });

  it('should call correct services when opening the deletion modal', async () => {
    const user = userEvent.setup();
    const { closeModal, openModal } = createModalMock();
    const onDeleteSpy = jest.fn();
    const removeFieldSpy = jest.fn();
    const updateSavedObject = jest.fn();
    const fieldNames = ['a', 'b', 'c'];
    const dataViews = {
      ...pluginStart.dataViews,
      updateSavedObject,
    };

    const { openDeleteModal } = plugin.start(createCoreStart({ openModal }), {
      ...pluginStart,
      dataViews,
    });

    const indexPatternMock = {
      isPersisted: () => true,
      removeRuntimeField: removeFieldSpy,
    } as unknown as DataView;

    await openDeleteModal({
      ctx: { dataView: indexPatternMock },
      fieldName: fieldNames,
      onDelete: onDeleteSpy,
    });

    expect(openModal).toHaveBeenCalled();

    const [[modalMountPoint]] = openModal.mock.calls;
    renderMountPoint(modalMountPoint);

    expect(screen.getByTestId('runtimeFieldDeleteConfirmModal')).toBeVisible();
    expect(screen.getByText('Remove 3 fields')).toBeVisible();
    expect(screen.getByText('You are about to remove these runtime fields:')).toBeVisible();
    fieldNames.forEach((fieldName) => {
      expect(screen.getByText(fieldName)).toBeVisible();
    });

    const confirmButton = screen.getByRole('button', { name: 'Remove fields' });
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByTestId('deleteModalConfirmText'), 'REMOVE');
    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);

    await waitFor(() => {
      expect(onDeleteSpy).toHaveBeenCalledWith(fieldNames);
    });
    expect(closeModal).toHaveBeenCalled();

    fieldNames.forEach((fieldName) => {
      expect(removeFieldSpy).toHaveBeenCalledWith(fieldName);
    });
    expect(updateSavedObject).toHaveBeenLastCalledWith(indexPatternMock);
  });

  it('should return a handler to close the modal', async () => {
    const { openDeleteModal } = plugin.start(coreStart, pluginStart);

    const closeModal = await openDeleteModal({
      fieldName: ['a'],
      ctx: { dataView: {} as DataView },
    });

    expect(typeof closeModal).toBe('function');
  });

  it('should expose a render props component to delete runtime fields', () => {
    const { DeleteRuntimeFieldProvider } = plugin.start(coreStart, pluginStart);

    const TestComponent = ({ callback }: { callback: (...args: any[]) => void }) => (
      <DeleteRuntimeFieldProvider dataView={{} as DataView}>
        {(...args) => {
          // Forward arguments passed down to children to our spy callback
          callback(args);
          return null;
        }}
      </DeleteRuntimeFieldProvider>
    );

    const spy = jest.fn();
    render(<TestComponent callback={spy} />);

    expect(spy).toHaveBeenCalled();
    const argumentsFromRenderProps = spy.mock.calls[0][0];

    expect(argumentsFromRenderProps.length).toBe(1);
    expect(typeof argumentsFromRenderProps[0]).toBe('function');
  });
});
