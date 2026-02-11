/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DrilldownDefinition } from '../types';
import type { DrilldownState } from '../../../server/drilldowns/types';

/**
 * Template for a pre-configured new drilldown, this gives ability to create a
 * drilldown from a template instead of user creating a drilldown from scratch.
 * This is used in "drilldown cloning" functionality, where drilldowns can be
 * cloned from one dashboard panel to another.
 */
export interface DrilldownTemplate {
  /**
   * A string that uniquely identifies this item in a list of `DrilldownTemplate[]`.
   */
  id: string;

  /**
   * A user facing text that provides information about the source of this template.
   */
  description: string;

  /**
   * Preliminary configuration of the new drilldown, to be used in the dynamicaction factory.
   */
  drilldownState: DrilldownState;
}

export type DrilldownFactory = Pick<
  DrilldownDefinition,
  'displayName' | 'euiIcon' | 'supportedTriggers'
> &
  DrilldownDefinition['setup'] & {
    order: number;
    type: string;
    isLicenseCompatible: boolean;
  };
