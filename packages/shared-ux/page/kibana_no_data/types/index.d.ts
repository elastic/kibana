/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NoDataPageProps } from '@kbn/shared-ux-page-no-data-types';

import {
  NoDataViewsPromptServices,
  NoDataViewsPromptKibanaDependencies,
} from '@kbn/shared-ux-prompt-no-data-views-types';
import {
  NoDataCardServices,
  NoDataCardKibanaDependencies,
} from '@kbn/shared-ux-card-no-data-types';

export interface Services {
  /** True if the cluster contains data, false otherwise. */
  hasESData: () => Promise<boolean>;
  /** True if Kibana instance contains user-created data view, false otherwise. */
  hasUserDataView: () => Promise<boolean>;
  /** if set to true allows creation of an ad-hoc data view from data view editor */
  allowAdHocDataView?: boolean;
  /** true if kibana instance has custom branding */
  hasCustomBranding: boolean | Observable<boolean>;
}

/**
 * A list of Services that are consumed by this component..
 */
export type KibanaNoDataPageServices = Services & NoDataCardServices & NoDataViewsPromptServices;

export interface KibanaDependencies {
  dataViews: {
    hasData: {
      hasESData: () => Promise<boolean>;
      hasUserDataView: () => Promise<boolean>;
    };
  };
  customBranding: {
    hasCustomBranding: boolean;
  };
}
/**
 * An interface containing a collection of Kibana plugins and services required to
 * render this component and its dependencies.
 */
export type KibanaNoDataPageKibanaDependencies = KibanaDependencies &
  NoDataViewsPromptKibanaDependencies &
  NoDataCardKibanaDependencies;

/**
 * Props for `KibanaNoDataPage`.
 */
export interface KibanaNoDataPageProps {
  /** Handler for successfully creating a new data view. */
  onDataViewCreated: (dataView: unknown) => void;
  /** `NoDataPage` configuration; see `NoDataPageProps`. */
  noDataConfig: NoDataPageProps;
  /** if set to true allows creation of an ad-hoc dataview from data view editor */
  allowAdHocDataView?: boolean;
}
