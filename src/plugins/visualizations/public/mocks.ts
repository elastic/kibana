/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from '../../../core/public';
import { Schema, VisualizationsSetup, VisualizationsStart } from './';
import { Schemas } from './vis_types';
import { VisualizationsPlugin } from './plugin';
import { spacesPluginMock } from '../../../../x-pack/plugins/spaces/public/mocks';
import { coreMock, applicationServiceMock } from '../../../core/public/mocks';
import { embeddablePluginMock } from '../../../plugins/embeddable/public/mocks';
import { expressionsPluginMock } from '../../../plugins/expressions/public/mocks';
import { dataPluginMock } from '../../../plugins/data/public/mocks';
import { dataViewPluginMocks } from '../../../plugins/data_views/public/mocks';
import { usageCollectionPluginMock } from '../../../plugins/usage_collection/public/mocks';
import { uiActionsPluginMock } from '../../../plugins/ui_actions/public/mocks';
import { inspectorPluginMock } from '../../../plugins/inspector/public/mocks';
import { savedObjectsPluginMock } from '../../../plugins/saved_objects/public/mocks';
import { urlForwardingPluginMock } from '../../../plugins/url_forwarding/public/mocks';
import { navigationPluginMock } from '../../../plugins/navigation/public/mocks';
import { presentationUtilPluginMock } from '../../../plugins/presentation_util/public/mocks';
import { savedObjectTaggingOssPluginMock } from '../../saved_objects_tagging_oss/public/mocks';
import { screenshotModePluginMock } from '../../screenshot_mode/public/mocks';

const createSetupContract = (): VisualizationsSetup => ({
  createBaseVisualization: jest.fn(),
  registerAlias: jest.fn(),
  hideTypes: jest.fn(),
  visEditorsRegistry: { registerDefault: jest.fn(), register: jest.fn(), get: jest.fn() },
});

const createStartContract = (): VisualizationsStart => ({
  get: jest.fn(),
  all: jest.fn(),
  getAliases: jest.fn(),
  getByGroup: jest.fn(),
  unRegisterAlias: jest.fn(),
  showNewVisModal: jest.fn(),
});

const createInstance = async () => {
  const plugin = new VisualizationsPlugin({} as PluginInitializerContext);

  const setup = plugin.setup(coreMock.createSetup(), {
    data: dataPluginMock.createSetupContract(),
    embeddable: embeddablePluginMock.createSetupContract(),
    expressions: expressionsPluginMock.createSetupContract(),
    inspector: inspectorPluginMock.createSetupContract(),
    usageCollection: usageCollectionPluginMock.createSetupContract(),
    urlForwarding: urlForwardingPluginMock.createSetupContract(),
    uiActions: uiActionsPluginMock.createSetupContract(),
  });
  const doStart = () =>
    plugin.start(coreMock.createStart(), {
      data: dataPluginMock.createStartContract(),
      dataViews: dataViewPluginMocks.createStartContract(),
      expressions: expressionsPluginMock.createStartContract(),
      inspector: inspectorPluginMock.createStartContract(),
      uiActions: uiActionsPluginMock.createStartContract(),
      application: applicationServiceMock.createStartContract(),
      embeddable: embeddablePluginMock.createStartContract(),
      spaces: spacesPluginMock.createStartContract(),
      getAttributeService: jest.fn(),
      savedObjectsClient: coreMock.createStart().savedObjects.client,
      savedObjects: savedObjectsPluginMock.createStartContract(),
      savedObjectsTaggingOss: savedObjectTaggingOssPluginMock.createStart(),
      navigation: navigationPluginMock.createStartContract(),
      presentationUtil: presentationUtilPluginMock.createStartContract(coreMock.createStart()),
      urlForwarding: urlForwardingPluginMock.createStartContract(),
      screenshotMode: screenshotModePluginMock.createStartContract(),
    });

  return {
    plugin,
    setup,
    doStart,
  };
};

export const createMockedVisEditorSchemas = (schemas: Array<Partial<Schema>>) =>
  new Schemas(schemas);

export const visualizationsPluginMock = {
  createSetupContract,
  createStartContract,
  createInstance,
};
