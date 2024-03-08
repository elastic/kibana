/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext } from 'react';

import {
  FieldCategoryKibanaProvider,
  FieldCategoryProvider,
} from '@kbn/management-settings-components-field-category';
import { UiSettingsScope } from '@kbn/core-ui-settings-common';
import type { FormServices, FormKibanaDependencies, Services } from './types';
import { reloadPageToast } from './reload_page_toast';

const FormContext = React.createContext<Services | null>(null);

/**
 * Props for {@link FormProvider}.
 */
export interface FormProviderProps extends FormServices {
  children: React.ReactNode;
}

/**
 * React Provider that provides services to a {@link Form} component and its dependents.
 */
export const FormProvider = ({ children, ...services }: FormProviderProps) => {
  const { saveChanges, showError, showReloadPagePrompt, ...rest } = services;

  return (
    <FormContext.Provider value={{ saveChanges, showError, showReloadPagePrompt }}>
      <FieldCategoryProvider {...rest}>{children}</FieldCategoryProvider>
    </FormContext.Provider>
  );
};

/**
 * Kibana-specific Provider that maps Kibana plugins and services to a {@link FormProvider}.
 */
export const FormKibanaProvider: FC<FormKibanaDependencies> = ({ children, ...deps }) => {
  const { settings, notifications, docLinks, theme, i18n } = deps;

  const services: Services = {
    saveChanges: (changes, scope: UiSettingsScope) => {
      const scopeClient = scope === 'namespace' ? settings.client : settings.globalClient;
      const arr = Object.entries(changes).map(([key, value]) =>
        scopeClient.set(key, value.unsavedValue)
      );
      return Promise.all(arr);
    },
    showError: (message: string) => notifications.toasts.addDanger(message),
    showReloadPagePrompt: () => notifications.toasts.add(reloadPageToast(theme, i18n)),
  };

  return (
    <FormContext.Provider value={services}>
      <FieldCategoryKibanaProvider {...{ docLinks, notifications, settings }}>
        {children}
      </FieldCategoryKibanaProvider>
    </FormContext.Provider>
  );
};

/**
 * React hook for accessing pre-wired services.
 */
export const useServices = () => {
  const context = useContext(FormContext);

  if (!context) {
    throw new Error(
      'FormContext is missing. Ensure your component or React root is wrapped with FormProvider.'
    );
  }

  return context;
};
