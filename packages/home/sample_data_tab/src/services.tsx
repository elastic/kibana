/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext } from 'react';
import type { EuiGlobalToastListToast as EuiToast } from '@elastic/eui';
import type { SampleDataSet } from '@kbn/home-sample-data-types';
import {
  SampleDataCardServices,
  SampleDataCardKibanaDependencies,
  SampleDataCardProvider,
  SampleDataCardKibanaProvider,
} from '@kbn/home-sample-data-card';

import { HttpFetchOptions } from '@kbn/core-http-browser';
import { URL_SAMPLE_DATA_API } from './constants';

type UnmountCallback = () => void;
type MountPoint<T extends HTMLElement = HTMLElement> = (element: T) => UnmountCallback;
type ValidNotifyString = string | MountPoint<HTMLElement>;

type NotifyInputFields = Pick<EuiToast, Exclude<keyof EuiToast, 'id' | 'text' | 'title'>> & {
  title?: ValidNotifyString;
  text?: ValidNotifyString;
};

type NotifyInput = string | NotifyInputFields;
type NotifyFn = (notification: NotifyInput) => void;

interface Services {
  fetchSampleDataSets: () => Promise<SampleDataSet[]>;
  notifyError: NotifyFn;
  notifySuccess: NotifyFn;
  logClick: (metric: string) => void;
  installLargeDataset: (params: LargeDataSetParams) => Promise<void>;
  checkLargeDatasetInstalled: () => Promise<boolean>;
  uninstallLargeDataset: () => Promise<void>;
}

/**
 * A list of services that are consumed by this component.
 */
export type SampleDataTabServices = Services & SampleDataCardServices;

const Context = React.createContext<Services | null>(null);

export interface LargeDataSetParams {
  nrOfDocuments: number;
}

/**
 * A Context Provider that provides services to the component and its dependencies.
 */
export const SampleDataTabProvider: FC<SampleDataTabServices> = ({ children, ...services }) => {
  const {
    fetchSampleDataSets,
    notifyError,
    notifySuccess,
    logClick,
    installLargeDataset,
    checkLargeDatasetInstalled,
    uninstallLargeDataset,
  } = services;
  return (
    <Context.Provider
      value={{
        fetchSampleDataSets,
        notifyError,
        notifySuccess,
        logClick,
        installLargeDataset,
        checkLargeDatasetInstalled,
        uninstallLargeDataset,
      }}
    >
      <SampleDataCardProvider {...services}>{children}</SampleDataCardProvider>
    </Context.Provider>
  );
};

interface KibanaDependencies {
  coreStart: {
    http: {
      get: (path: string) => Promise<unknown>;
      post: (path: string, options: HttpFetchOptions) => Promise<unknown>;
    };
    notifications: {
      toasts: {
        addDanger: NotifyFn;
        addSuccess: NotifyFn;
      };
    };
  };
  // TODO: clintandrewhall - This is using a type from the home plugin.  I'd prefer we
  // use the type directly from Kibana instead.
  trackUiMetric: (type: string, eventNames: string | string[], count?: number) => void;
}

/**
 * Services that are consumed by this component and its dependencies.
 */
export type SampleDataTabKibanaDependencies = KibanaDependencies & SampleDataCardKibanaDependencies;

/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export const SampleDataTabKibanaProvider: FC<SampleDataTabKibanaDependencies> = ({
  children,
  ...dependencies
}) => {
  const { coreStart, trackUiMetric } = dependencies;
  const { http, notifications } = coreStart;

  const installLargeDataset = async (params: LargeDataSetParams) => {
    const { nrOfDocuments } = params;
    await http.post(`${URL_SAMPLE_DATA_API}/large_dataset`, {
      body: JSON.stringify({ nrOfDocuments }),
    });
  };

  const checkLargeDatasetInstalled = async () => {
    const resp = (await http.get(`${URL_SAMPLE_DATA_API}/large_dataset/installed`)) as {
      installed: boolean;
    };
    return resp.installed;
  };

  const uninstallLargeDataset = async () => {
    await http.delete(`${URL_SAMPLE_DATA_API}/large_dataset`);
  };

  const value: Services = {
    fetchSampleDataSets: async () => (await http.get(URL_SAMPLE_DATA_API)) as SampleDataSet[],
    notifyError: (input) => notifications.toasts.addDanger(input),
    notifySuccess: (input) => notifications.toasts.addSuccess(input),
    logClick: (eventName) => trackUiMetric('click', eventName),
    installLargeDataset,
    checkLargeDatasetInstalled,
    uninstallLargeDataset,
  };

  return (
    <Context.Provider {...{ value }}>
      <SampleDataCardKibanaProvider {...dependencies}>{children}</SampleDataCardKibanaProvider>
    </Context.Provider>
  );
};

/**
 * React hook for accessing pre-wired services.
 */
export function useServices() {
  const context = useContext(Context);

  if (!context) {
    throw new Error(
      'SampleDataTab Context is missing.  Ensure your component or React root is wrapped with SampleDataTabContext.'
    );
  }

  return context;
}
