/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CommonProps } from '@elastic/eui';
import {
  NoDataCardProps,
  NoDataCardServices,
  NoDataCardKibanaDependencies,
} from '@kbn/shared-ux-card-no-data-types';

export type NoDataPageActions = NoDataCardProps;

export interface ActionCardProps {
  /**
   * An object of `NoDataPageActions`.
   *
   * Use `elasticAgent` as the primary key for pre-configured cards of this type.
   * Otherwise use a custom key that contains `EuiCard` props.
   */
  action: Record<string, NoDataPageActions>;
}

export interface NoDataPageProps extends CommonProps, ActionCardProps {
  /**
   * Single name for the current solution, used to auto-generate the title, logo, description, and button label
   */
  solution: string;
  /**
   * Required in "kibana" flavor to set the docs link for the whole solution, otherwise optional
   */
  docsLink?: string;
  /**
   * Optionally replace the auto-generated logo
   */
  logo?: string;
  /**
   * Optionally replace the auto-generated page title (h1)
   */
  pageTitle?: string;
  /**
   * Optionally replace the auto-generated page description
   */
  pageDescription?: string;
}

/**
 * A list of services that are consumed by this component.
 */
export type NoDataPageServices = NoDataCardServices;

/**
 * An interface containing a collection of Kibana plugins and services required to
 * render this component.
 */
export type NoDataPageKibanaDependencies = NoDataCardKibanaDependencies;
