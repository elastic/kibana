/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC, PropsWithChildren } from 'react';
import type { SampleDataSet } from '@kbn/home-sample-data-types';
import type {
  SampleDataCardServices,
  SampleDataCardKibanaDependencies,
  NotifyFn,
} from '@kbn/home-sample-data-card';
interface Services {
  fetchSampleDataSets: () => Promise<SampleDataSet[]>;
  notifyError: NotifyFn;
  logClick: (metric: string) => void;
}
/**
 * A list of services that are consumed by this component.
 */
export type SampleDataTabServices = Services & SampleDataCardServices;
/**
 * A Context Provider that provides services to the component and its dependencies.
 */
export declare const SampleDataTabProvider: FC<PropsWithChildren<SampleDataTabServices>>;
interface KibanaDependencies {
  coreStart: {
    http: {
      get: (path: string) => Promise<unknown>;
    };
    notifications: {
      toasts: {
        addDanger: NotifyFn;
      };
    };
  };
  trackUiMetric: (type: string, eventNames: string | string[], count?: number) => void;
}
/**
 * Services that are consumed by this component and its dependencies.
 */
export type SampleDataTabKibanaDependencies = KibanaDependencies & SampleDataCardKibanaDependencies;
/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export declare const SampleDataTabKibanaProvider: FC<
  PropsWithChildren<SampleDataTabKibanaDependencies>
>;
/**
 * React hook for accessing pre-wired services.
 */
export declare function useServices(): Services;
export {};
