/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const CONTROL_GROUP_TYPE = 'control_group';

export type ControlGroupChainingSystem = 'HIERARCHICAL' | 'NONE';

export interface ControlGroupTelemetry {
  total: number;
  chaining_system: {
    [key: string]: number;
  };
  label_position: {
    [key: string]: number;
  };
  ignore_settings: {
    [key: string]: number;
  };
  by_type: {
    [key: string]: {
      total: number;
      details: { [key: string]: number };
    };
  };
}
