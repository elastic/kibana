/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

<<<<<<<< HEAD:packages/kbn-api-contracts/src/diff/detect_additional_properties_tightening/types.ts
import type { OasdiffEntry } from '../parse_oasdiff';

export interface DetectionResult {
  entries: OasdiffEntry[];
  warnings: string[];
========
export class InvalidRouteParamsException extends Error {
  constructor(
    message: string,
    public readonly patched: { path: Record<string, any>; query: Record<string, any> }
  ) {
    super(message);
    this.name = 'InvalidRouteParamsException';
  }
>>>>>>>> 9.4:src/platform/packages/shared/kbn-typed-react-router-config/src/errors/invalid_route_params_exception.ts
}

export interface ComponentTightening {
  componentName: string;
  pointers: string[];
}

export type SkipKey = string;
