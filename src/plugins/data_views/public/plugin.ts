/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { getIndexPatternLoad } from './expressions';
import {
  DataViewsPublicPluginSetup,
  DataViewsPublicPluginStart,
  DataViewsPublicSetupDependencies,
  DataViewsPublicStartDependencies,
} from './types';

import {
  DataViewsService,
  onRedirectNoIndexPattern,
  DataViewsApiClient,
  UiSettingsPublicToCommon,
  SavedObjectsClientPublicToCommon,
} from '.';

export class DataViewsPublicPlugin
  implements
    Plugin<
      DataViewsPublicPluginSetup,
      DataViewsPublicPluginStart,
      DataViewsPublicSetupDependencies,
      DataViewsPublicStartDependencies
    >
{
  public setup(
    core: CoreSetup<DataViewsPublicStartDependencies, DataViewsPublicPluginStart>,
    { expressions }: DataViewsPublicSetupDependencies
  ): DataViewsPublicPluginSetup {
    expressions.registerFunction(getIndexPatternLoad({ getStartServices: core.getStartServices }));

    return {};
  }

  public start(
    core: CoreStart,
    { fieldFormats }: DataViewsPublicStartDependencies
  ): DataViewsPublicPluginStart {
    const { uiSettings, http, notifications, savedObjects, overlays, application } = core;

    return new DataViewsService({
      uiSettings: new UiSettingsPublicToCommon(uiSettings),
      savedObjectsClient: new SavedObjectsClientPublicToCommon(savedObjects.client),
      apiClient: new DataViewsApiClient(http),
      fieldFormats,
      onNotification: (toastInputFields) => {
        notifications.toasts.add(toastInputFields);
      },
      onError: notifications.toasts.addError.bind(notifications.toasts),
      onRedirectNoIndexPattern: onRedirectNoIndexPattern(
        application.capabilities,
        application.navigateToApp,
        overlays
      ),
    });
  }

  public stop() {}
}
