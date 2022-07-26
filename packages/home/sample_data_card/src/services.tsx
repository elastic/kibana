/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, MouseEventHandler, useContext } from 'react';
import { EuiGlobalToastListToast as EuiToast } from '@elastic/eui';

import { SAMPLE_DATA_API } from './constants';

type NavigateToUrl = (url: string) => Promise<void> | void;
type UnmountCallback = () => void;
type MountPoint<T extends HTMLElement = HTMLElement> = (element: T) => UnmountCallback;
type ValidNotifyString = string | MountPoint<HTMLElement>;

type NotifyInputFields = Pick<EuiToast, Exclude<keyof EuiToast, 'id' | 'text' | 'title'>> & {
  title?: ValidNotifyString;
  text?: ValidNotifyString;
};

type NotifyInput = string | NotifyInputFields;
type NotifyFn = (notification: NotifyInput) => void;

/**
 * A list of services that are consumed by this component.
 */
export interface Services {
  addBasePath: (path: string) => string;
  getAppNavigationHandler: (path: string) => MouseEventHandler;
  installSampleDataSet: (id: string, defaultIndex: string) => Promise<void>;
  notifyError: NotifyFn;
  notifySuccess: NotifyFn;
  removeSampleDataSet: (id: string, defaultIndex: string) => Promise<void>;
}

const Context = React.createContext<Services | null>(null);

/**
 * A Context Provider that provides services to the component and its dependencies.
 */
export const SampleDataCardProvider: FC<Services> = ({ children, ...services }) => {
  const {
    addBasePath,
    getAppNavigationHandler,
    installSampleDataSet,
    notifyError,
    notifySuccess,
    removeSampleDataSet,
  } = services;

  return (
    <Context.Provider
      value={{
        addBasePath,
        getAppNavigationHandler,
        installSampleDataSet,
        notifyError,
        notifySuccess,
        removeSampleDataSet,
      }}
    >
      {children}
    </Context.Provider>
  );
};

export interface KibanaDependencies {
  coreStart: {
    application: {
      navigateToUrl: NavigateToUrl;
    };
    http: {
      basePath: {
        prepend: (path: string) => string;
      };
      delete: (path: string) => Promise<unknown>;
      post: (path: string) => Promise<unknown>;
    };
    notifications: {
      toasts: {
        addDanger: NotifyFn;
        addSuccess: NotifyFn;
      };
    };
    uiSettings: {
      get: (key: string, defaultOverride?: any) => any;
      isDefault: (key: string) => boolean;
      set: (key: string, value: any) => Promise<boolean>;
    };
  };
  dataViews: {
    clearCache: () => void;
  };
}

/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export const SampleDataCardKibanaProvider: FC<KibanaDependencies> = ({
  children,
  ...dependencies
}) => {
  const { application, http, notifications, uiSettings } = dependencies.coreStart;
  const clearDataViewsCache = dependencies.dataViews.clearCache;

  const value: Services = {
    addBasePath: http.basePath.prepend,
    getAppNavigationHandler: (targetUrl) => (event) => {
      if (event.altKey || event.metaKey || event.ctrlKey) {
        return;
      }
      event.preventDefault();
      application.navigateToUrl(http.basePath.prepend(targetUrl));
    },
    installSampleDataSet: async (id, defaultIndex) => {
      await http.post(`${SAMPLE_DATA_API}/${id}`);

      if (uiSettings.isDefault('defaultIndex')) {
        uiSettings.set('defaultIndex', defaultIndex);
      }

      clearDataViewsCache();
    },
    removeSampleDataSet: async (id, defaultIndex) => {
      await http.delete(`${SAMPLE_DATA_API}/${id}`);

      if (
        !uiSettings.isDefault('defaultIndex') &&
        uiSettings.get('defaultIndex') === defaultIndex
      ) {
        uiSettings.set('defaultIndex', null);
      }

      clearDataViewsCache();
    },
    notifyError: (input) => notifications.toasts.addDanger(input),
    notifySuccess: (input) => notifications.toasts.addSuccess(input),
  };

  return <Context.Provider {...{ value }}>{children}</Context.Provider>;
};

/**
 * React hook for accessing pre-wired services.
 */
export function useServices() {
  const context = useContext(Context);

  if (!context) {
    throw new Error(
      'SampleDataCard Context is missing.  Ensure your component or React root is wrapped with SampleDataCardContext.'
    );
  }

  return context;
}
