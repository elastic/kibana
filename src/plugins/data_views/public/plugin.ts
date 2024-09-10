/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { getIndexPatternLoad } from './expressions';
import type { ClientConfigType } from '../common/types';
import {
  DataViewsPublicPluginSetup,
  DataViewsPublicPluginStart,
  DataViewsPublicSetupDependencies,
  DataViewsPublicStartDependencies,
} from './types';

import { DataViewsApiClient } from '.';
import { ContentMagementWrapper } from './content_management_wrapper';

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
  private rollupsEnabled: boolean = false;
  private readonly callResolveCluster: boolean;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.callResolveCluster = initializerContext.env.packageInfo.buildFlavor === 'traditional';
  }

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

    return {
      enableRollups: () => (this.rollupsEnabled = true),
    };
  }

  public start(
    core: CoreStart,
    { fieldFormats, contentManagement }: DataViewsPublicStartDependencies
  ): DataViewsPublicPluginStart {
    const { uiSettings, http, notifications, application } = core;

    const onNotifDebounced = debounceByKey(
      notifications.toasts.add.bind(notifications.toasts),
      10000
    );
    const onErrorDebounced = debounceByKey(
      notifications.toasts.addError.bind(notifications.toasts),
      10000
    );

    const config = this.initializerContext.config.get<ClientConfigType>();

    return new DataViewsServicePublic({
      hasData: this.hasData.start(core, this.callResolveCluster),
      uiSettings: new UiSettingsPublicToCommon(uiSettings),
      savedObjectsClient: new ContentMagementWrapper(contentManagement.client),
      apiClient: new DataViewsApiClient(http, async () => {
        const currentUser = await core.security.authc.getCurrentUser();
        return currentUser?.profile_uid;
      }),
      fieldFormats,
      http,
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
      getRollupsEnabled: () => this.rollupsEnabled,
      scriptedFieldsEnabled: config.scriptedFieldsEnabled === false ? false : true, // accounting for null value
    });
  }

  public stop() {}
}
