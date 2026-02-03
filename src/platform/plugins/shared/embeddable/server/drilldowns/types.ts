/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ObjectType, Type } from '@kbn/config-schema';
import type { Reference } from '@kbn/content-management-utils';

export type DrilldownState = { label: string; trigger: string; type: string };

export type DrilldownsState = {
  drilldowns?: DrilldownState[];
};

export type DrilldownSetup<
  StoredState extends DrilldownState = DrilldownState,
  State extends DrilldownState = DrilldownState
> = {
  /**
   * Schema defining distinct state for the drilldown type
   */
  schema: ObjectType;
  /**
   * List of triggers supported by this drilldown type
   * Used to
   * 1) narrow registry schemas by intersection of (embeddable) supported triggers
   * 2) populate triggers schema
   */
  supportedTriggers: string[];
  /**
   * Called on REST read routes to inject references and convert Stored State into API State
   */
  transformOut?: (storedState: StoredState, references?: Reference[]) => State;
  /**
   * Called on REST write routes to convert API State into Stored State and extracts references
   */
  transformIn?: (state: State) => {
    state: StoredState;
    references?: Reference[];
  };
};

export type GetDrilldownsSchemaFnType = (embeddableSupportedTriggers: string[]) => ObjectType<{
  drilldowns: Type<DrilldownState[] | undefined>;
}>;
