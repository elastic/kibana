/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstAllCommands, ESQLSingleAstItem } from '@elastic/esql/types';
import type { Location } from './types';
/**
 * Pause before using this in new places. Where possible, use the Location enum directly.
 *
 * This is primarily around for backwards compatibility with the old system of command and option names.
 */
export declare const getLocationFromCommandOrOptionName: (name: string) => Location;
/**
 * Identifies the location ID at the given position
 */
export declare function getLocationInfo(
  position: ESQLSingleAstItem | number,
  parentCommand: ESQLAstAllCommands,
  isTimeseriesSource: boolean,
  withinAggFunction: boolean
): {
  id: Location;
  displayName: string;
};
