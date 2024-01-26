/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext } from 'react';

import {
  FormProvider,
  FormKibanaProvider,
  type FormKibanaDependencies,
  type FormServices,
} from '@kbn/management-settings-components-form';
import { UiSettingMetadata } from '@kbn/management-settings-types';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { normalizeSettings } from '@kbn/management-settings-utilities';
import { Subscription } from 'rxjs';
import { ScopedHistory } from '@kbn/core-application-browser';
import { UiSettingsScope } from '@kbn/core-ui-settings-common';

export interface Services {
  getAllowlistedSettings: (scope: UiSettingsScope) => Record<string, UiSettingMetadata>;
  subscribeToUpdates: (fn: () => void, scope: UiSettingsScope) => Subscription;
  isCustomSetting: (key: string, scope: UiSettingsScope) => boolean;
  isOverriddenSetting: (key: string, scope: UiSettingsScope) => boolean;
  addUrlToHistory: (url: string) => void;
}

export type SettingsApplicationServices = Services & FormServices;

export interface KibanaDependencies {
  settings: {
    client: Pick<
      IUiSettingsClient,
      'getAll' | 'isCustom' | 'isOverridden' | 'getUpdate$' | 'validateValue'
    >;
    globalClient: Pick<
      IUiSettingsClient,
      'getAll' | 'isCustom' | 'isOverridden' | 'getUpdate$' | 'validateValue'
    >;
  };
  history: ScopedHistory;
}

export type SettingsApplicationKibanaDependencies = KibanaDependencies & FormKibanaDependencies;

const SettingsApplicationContext = React.createContext<Services | null>(null);

/**
 * A Context Provider that provides services to the component and its dependencies.
 */
export const SettingsApplicationProvider: FC<SettingsApplicationServices> = ({
  children,
  ...services
}) => {
  // Destructure the services to avoid a type-widening inclusion of unrelated services.
  const {
    saveChanges,
    showError,
    validateChange,
    showReloadPagePrompt,
    links,
    showDanger,
    getAllowlistedSettings,
    subscribeToUpdates,
    isCustomSetting,
    isOverriddenSetting,
    addUrlToHistory,
  } = services;

  return (
    <SettingsApplicationContext.Provider
      value={{
        getAllowlistedSettings,
        subscribeToUpdates,
        isCustomSetting,
        isOverriddenSetting,
        addUrlToHistory,
      }}
    >
      <FormProvider
        {...{ saveChanges, showError, validateChange, showReloadPagePrompt, links, showDanger }}
      >
        {children}
      </FormProvider>
    </SettingsApplicationContext.Provider>
  );
};

/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export const SettingsApplicationKibanaProvider: FC<SettingsApplicationKibanaDependencies> = ({
  children,
  ...dependencies
}) => {
  const { docLinks, notifications, theme, i18n, settings, history } = dependencies;
  const { client, globalClient } = settings;

  const getScopeClient = (scope: UiSettingsScope) => {
    return scope === 'namespace' ? client : globalClient;
  };

  const getAllowlistedSettings = (scope: UiSettingsScope) => {
    const scopeClient = getScopeClient(scope);
    const rawSettings = Object.fromEntries(
      Object.entries(scopeClient.getAll()).filter(
        ([settingId, settingDef]) => !settingDef.readonly && !client.isCustom(settingId)
      )
    );
    return normalizeSettings(rawSettings);
  };

  const isCustomSetting = (key: string, scope: UiSettingsScope) => {
    const scopeClient = getScopeClient(scope);
    return scopeClient.isCustom(key);
  };

  const isOverriddenSetting = (key: string, scope: UiSettingsScope) => {
    const scopeClient = getScopeClient(scope);
    return scopeClient.isOverridden(key);
  };

  const subscribeToUpdates = (fn: () => void, scope: UiSettingsScope) => {
    const scopeClient = getScopeClient(scope);
    return scopeClient.getUpdate$().subscribe(fn);
  };

  const services: Services = {
    getAllowlistedSettings,
    isCustomSetting,
    isOverriddenSetting,
    subscribeToUpdates,
    addUrlToHistory: (url: string) => history.push({ pathname: '', search: url }),
  };

  return (
    <SettingsApplicationContext.Provider value={services}>
      <FormKibanaProvider {...{ docLinks, notifications, theme, i18n, settings }}>
        {children}
      </FormKibanaProvider>
    </SettingsApplicationContext.Provider>
  );
};

/**
 * React hook for accessing pre-wired services.
 */
export const useServices = () => {
  const context = useContext(SettingsApplicationContext);

  if (!context) {
    throw new Error(
      'SettingsApplicationContext is missing.  Ensure your component or React root is wrapped with SettingsApplicationProvider.'
    );
  }

  return context;
};
