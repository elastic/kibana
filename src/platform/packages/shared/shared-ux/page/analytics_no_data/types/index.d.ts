/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Observable } from 'rxjs';

import { NoDataPagePluginSetup } from '@kbn/no-data-page-plugin/public';
import {
  KibanaNoDataPageServices,
  KibanaNoDataPageKibanaDependencies,
} from '@kbn/shared-ux-page-kibana-no-data-types';

/**
 * A list of services that are consumed by this component.
 */
export interface Services {
  kibanaGuideDocLink: string;
  customBranding: { hasCustomBranding$: Observable<boolean> };
  prependBasePath: (path: string) => string;
  getHttp: <T>(path: string) => Promise<T>;
  pageFlavor: AnalyticsNoDataPageFlavor;
}

/**
 * Services that are consumed by this component and any dependencies.
 */
export type AnalyticsNoDataPageServices = Services & KibanaNoDataPageServices;

export type AnalyticsNoDataPageFlavor = 'kibana' | 'serverless_search' | 'serverless_observability';

export interface KibanaDependencies {
  coreStart: {
    docLinks: {
      links: {
        kibana: {
          guide: string;
        };
      };
    };
    customBranding: {
      hasCustomBranding$: Observable<boolean>;
    };
    http: {
      basePath: {
        prepend: (path: string) => string;
      };
      get: <T>(path: string, options?: object) => Promise<T>;
    };
  };
  noDataPage?: NoDataPagePluginSetup;
}

/**
 * An interface containing a collection of Kibana plugins and services required to
 * render this component as well as any dependencies.
 */
export type AnalyticsNoDataPageKibanaDependencies = KibanaDependencies &
  KibanaNoDataPageKibanaDependencies;

/**
 * Props for the `AnalyticsNoDataPage` component.
 */
export interface AnalyticsNoDataPageProps {
  /** Handler for successfully creating a new data view. */
  onDataViewCreated: (dataView: unknown) => void;
  /** if set to true allows creation of an ad-hoc data view from data view editor */
  allowAdHocDataView?: boolean;
  /** If the cluster has data, this handler allows the user to try ES|QL */
  onTryESQL?: () => void;
  /** Handler for when try ES|QL is clicked and user has been navigated to try ES|QL in discover. */
  onESQLNavigationComplete?: () => void;
}
