/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  FieldRowProvider,
  FieldRowKibanaProvider,
} from '@kbn/management-settings-components-field-row';
import React, { FC, useContext } from 'react';
import { SettingType, UnsavedFieldChange } from '@kbn/management-settings-types';

import type { FormServices, FormKibanaDependencies, Services } from './types';
import { ReloadPageToast } from './reload_page_toast';

const FormContext = React.createContext<Services | null>(null);

/**
 * React Provider that provides services to a {@link Form} component and its dependents.
 */
export const FormProvider: FC<FormServices> = ({ children, ...services }) => {
  const { saveChanges, showError, showReloadPagePrompt, ...rest } = services;

  return (
    <FormContext.Provider value={{ saveChanges, showError, showReloadPagePrompt }}>
      <FieldRowProvider {...rest}>{children}</FieldRowProvider>
    </FormContext.Provider>
  );
  return <FieldRowProvider {...services}>{children}</FieldRowProvider>;
};

/**
 * Kibana-specific Provider that maps Kibana plugins and services to a {@link FormProvider}.
 */
export const FormKibanaProvider: FC<FormKibanaDependencies> = ({ children, ...deps }) => {
  const { settings, toasts, docLinks, theme, i18nStart } = deps;

  return (
    <FormContext.Provider
      value={{
        saveChanges: (changes: Record<string, UnsavedFieldChange<SettingType>>) => {
          const arr = Object.entries(changes).map(([key, value]) =>
            settings.client.set(key, value)
          );
          return Promise.all(arr);
        },
        showError: (message: string) => toasts.addDanger(message),
        showReloadPagePrompt: () => toasts.add(ReloadPageToast(theme, i18nStart)),
      }}
    >
      <FieldRowKibanaProvider {...{ docLinks, toasts }}>{children}</FieldRowKibanaProvider>
    </FormContext.Provider>
  );
};

/**
 * React hook for accessing pre-wired services.
 *
 * @see {@link FormServices}
 */
export const useServices = () => {
  const context = useContext(FormContext);

  if (!context) {
    throw new Error(
      'FormContext is missing.  Ensure your component or React root is wrapped with FormProvider.'
    );
  }

  return context;
};
