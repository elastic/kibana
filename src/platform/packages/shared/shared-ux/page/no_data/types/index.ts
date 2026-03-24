/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CommonProps } from '@elastic/eui';
import type {
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
export interface NoDataPageProps extends CommonProps, ActionCardProps {}

/**
 * A list of services that are consumed by this component.
 */
export type NoDataPageServices = NoDataCardServices;

/**
 * An interface containing a collection of Kibana plugins and services required to
 * render this component.
 */
export type NoDataPageKibanaDependencies = NoDataCardKibanaDependencies;
