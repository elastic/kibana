/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';

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
import { usageCollectionPluginMock } from '../../usage_collection/public/mocks';

import { DataViewEditorLazy } from './components/data_view_editor_lazy';
import { DataViewEditorPlugin } from './plugin';

const noop = () => {};

describe('DataViewEditorPlugin', () => {
  const coreStart: CoreStart = coreMock.createStart();
  const pluginStart = {
    data: dataPluginMock.createStartContract(),
    usageCollection: usageCollectionPluginMock.createSetupContract(),
    dataViews: dataPluginMock.createStartContract().dataViews,
  };

  let plugin: DataViewEditorPlugin;

  beforeEach(() => {
    plugin = new DataViewEditorPlugin();
  });

  test('should expose a handler to open the data view field editor', async () => {
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

    openEditor({ onSave: onSaveSpy });

    expect(openFlyout).toHaveBeenCalled();

    const [[arg]] = openFlyout.mock.calls;
    const i18nProvider = arg.props.children;
    expect(i18nProvider.props.children.type).toBe(DataViewEditorLazy);

    // We force call the "onSave" prop from the <RuntimeFieldEditorFlyoutContent /> component
    // and make sure that the the spy is being called.
    // Note: we are testing implementation details, if we change or rename the "onSave" prop on
    // the component, we will need to update this test accordingly.
    expect(i18nProvider.props.children.props.onSave).toBeDefined();
    i18nProvider.props.children.props.onSave();
    expect(onSaveSpy).toHaveBeenCalled();
  });

  test('should return a handler to close the flyout', async () => {
    const { openEditor } = await plugin.start(coreStart, pluginStart);

    const closeEditorHandler = openEditor({ onSave: noop });
    expect(typeof closeEditorHandler).toBe('function');
  });
});
