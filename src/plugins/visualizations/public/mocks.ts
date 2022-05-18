/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from '@kbn/core/public';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import { coreMock, applicationServiceMock } from '@kbn/core/public/mocks';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { inspectorPluginMock } from '@kbn/inspector-plugin/public/mocks';
import { savedObjectsPluginMock } from '@kbn/saved-objects-plugin/public/mocks';
import { urlForwardingPluginMock } from '@kbn/url-forwarding-plugin/public/mocks';
import { navigationPluginMock } from '@kbn/navigation-plugin/public/mocks';
import { presentationUtilPluginMock } from '@kbn/presentation-util-plugin/public/mocks';
import { savedObjectTaggingOssPluginMock } from '@kbn/saved-objects-tagging-oss-plugin/public/mocks';
import { screenshotModePluginMock } from '@kbn/screenshot-mode-plugin/public/mocks';
import { VisualizationsPlugin } from './plugin';
import { Schemas } from './vis_types';
import { Schema, VisualizationsSetup, VisualizationsStart } from '.';

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
