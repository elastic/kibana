/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { getIndexPatternLoad } from './expressions';
import {
  DataViewsPublicPluginSetup,
  DataViewsPublicPluginStart,
  DataViewsPublicSetupDependencies,
  DataViewsPublicStartDependencies,
} from './types';

import { DataViewsApiClient } from '.';
import { SavedObjectsClientPublicToCommon } from './saved_objects_client_wrapper';

import { UiSettingsPublicToCommon } from './ui_settings_wrapper';

import { DataViewsServicePublic } from './data_views_service_public';
import { getIndices, HasData } from './services';

import { debounceByKey } from './debounce_by_key';

import { DATA_VIEW_SAVED_OBJECT_TYPE } from '../common/constants';
import { LATEST_VERSION } from '../common/content_management/v1/constants';

export class DataViewsPublicPlugin
  implements
    Plugin<
      DataViewsPublicPluginSetup,
      DataViewsPublicPluginStart,
      DataViewsPublicSetupDependencies,
      DataViewsPublicStartDependencies
    >
{
  private readonly hasData = new HasData();

  public setup(
    core: CoreSetup<DataViewsPublicStartDependencies, DataViewsPublicPluginStart>,
    { expressions, contentManagement }: DataViewsPublicSetupDependencies
  ): DataViewsPublicPluginSetup {
    expressions.registerFunction(getIndexPatternLoad({ getStartServices: core.getStartServices }));

    contentManagement.registry.register({
      id: DATA_VIEW_SAVED_OBJECT_TYPE,
      version: {
        latest: LATEST_VERSION,
      },
      name: i18n.translate('dataViews.contentManagementType', {
        defaultMessage: 'Data view',
      }),
    });

    return {};
  }

  public start(
    core: CoreStart,
    { fieldFormats, contentManagement }: DataViewsPublicStartDependencies
  ): DataViewsPublicPluginStart {
    const { uiSettings, http, notifications, application, savedObjects } = core;

    const onNotifDebounced = debounceByKey(
      notifications.toasts.add.bind(notifications.toasts),
      10000
    );
    const onErrorDebounced = debounceByKey(
      notifications.toasts.addError.bind(notifications.toasts),
      10000
    );

    return new DataViewsServicePublic({
      hasData: this.hasData.start(core),
      uiSettings: new UiSettingsPublicToCommon(uiSettings),
      savedObjectsClient: new SavedObjectsClientPublicToCommon(
        contentManagement.client,
        savedObjects.client
      ),
      apiClient: new DataViewsApiClient(http),
      fieldFormats,
      onNotification: (toastInputFields, key) => {
        onNotifDebounced(key)(toastInputFields);
      },
      onError: (error, toastInputFields, key) => {
        onErrorDebounced(key)(error, toastInputFields);
      },
      getCanSave: () => Promise.resolve(application.capabilities.indexPatterns.save === true),
      getCanSaveSync: () => application.capabilities.indexPatterns.save === true,
      getCanSaveAdvancedSettings: () =>
        Promise.resolve(application.capabilities.advancedSettings.save === true),
      getIndices: (props) => getIndices({ ...props, http: core.http }),
    });
  }

  public stop() {}
}
