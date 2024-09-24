/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, PropsWithChildren, useContext } from 'react';

import {
  FormProvider,
  FormKibanaProvider,
  type FormKibanaDependencies,
  type FormServices,
} from '@kbn/management-settings-components-form';
import { SettingsCapabilities, UiSettingMetadata } from '@kbn/management-settings-types';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { normalizeSettings } from '@kbn/management-settings-utilities';
import { Subscription } from 'rxjs';
import { ApplicationStart, ScopedHistory } from '@kbn/core-application-browser';
import { UiSettingsScope } from '@kbn/core-ui-settings-common';
import { RegistryEntry, SectionRegistryStart } from '@kbn/management-settings-section-registry';
import { ToastsStart } from '@kbn/core-notifications-browser';
import { ChromeBadge, ChromeStart } from '@kbn/core-chrome-browser';

export interface Services {
  getAllowlistedSettings: (scope: UiSettingsScope) => Record<string, UiSettingMetadata>;
  getSections: (scope: UiSettingsScope) => RegistryEntry[];
  getToastsService: () => ToastsStart;
  getCapabilities: () => SettingsCapabilities;
  setBadge: (badge: ChromeBadge) => void;
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
  sectionRegistry: SectionRegistryStart;
  notifications: {
    toasts: ToastsStart;
  };
  application: Pick<ApplicationStart, 'capabilities'>;
  chrome: Pick<ChromeStart, 'setBadge'>;
}

export type SettingsApplicationKibanaDependencies = KibanaDependencies & FormKibanaDependencies;

const SettingsApplicationContext = React.createContext<Services | null>(null);

/**
 * A Context Provider that provides services to the component and its dependencies.
 */
export const SettingsApplicationProvider: FC<PropsWithChildren<SettingsApplicationServices>> = ({
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
    getSections,
    getCapabilities,
    setBadge,
    getToastsService,
    subscribeToUpdates,
    isCustomSetting,
    isOverriddenSetting,
    addUrlToHistory,
  } = services;

  return (
    <SettingsApplicationContext.Provider
      value={{
        getAllowlistedSettings,
        getSections,
        getToastsService,
        getCapabilities,
        setBadge,
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
export const SettingsApplicationKibanaProvider: FC<
  PropsWithChildren<SettingsApplicationKibanaDependencies>
> = ({ children, ...dependencies }) => {
  const {
    docLinks,
    notifications,
    theme,
    i18n,
    settings,
    history,
    sectionRegistry,
    application,
    chrome,
  } = dependencies;
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

  const getSections = (scope: UiSettingsScope) => {
    return scope === 'namespace'
      ? sectionRegistry.getSpacesSections()
      : sectionRegistry.getGlobalSections();
  };

  const getCapabilities = () => {
    const { advancedSettings, globalSettings } = application.capabilities;
    return {
      spaceSettings: {
        show: advancedSettings.show as boolean,
        save: advancedSettings.save as boolean,
      },
      globalSettings: {
        show: globalSettings.show as boolean,
        save: globalSettings.save as boolean,
      },
    };
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
    getSections,
    getToastsService: () => notifications.toasts,
    getCapabilities,
    setBadge: (badge: ChromeBadge) => chrome.setBadge(badge),
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
