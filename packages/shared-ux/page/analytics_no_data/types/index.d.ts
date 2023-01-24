/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  KibanaNoDataPageServices,
  KibanaNoDataPageKibanaDependencies,
} from '@kbn/shared-ux-page-kibana-no-data-types';

/**
 * A list of services that are consumed by this component.
 */
export interface Services {
  kibanaGuideDocLink: string;
  customBranding: { showPlainSpinner?: boolean; hasCustomBranding$: Observable<boolean> };
}

/**
 * Services that are consumed by this component and any dependencies.
 */
export type AnalyticsNoDataPageServices = Services & KibanaNoDataPageServices;

export interface KibanaDependencies {
  coreStart: {
    docLinks: {
      links: {
        kibana: {
          guide: string;
        };
      };
    };
  };
  customBranding: {
    hasCustomBranding$: Observable<boolean>;
    showPlainSpinner?: boolean;
  };
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
}
