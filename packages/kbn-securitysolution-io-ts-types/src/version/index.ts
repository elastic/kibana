/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';
import { PositiveIntegerGreaterThanZero } from '../positive_integer_greater_than_zero';

/**
 * Note this is just a positive number, but we use it as a type here which is still ok.
 * This type was originally from "x-pack/plugins/security_solution/common/detection_engine/schemas/common/schemas.ts"
 * but is moved here to make things more portable. No unit tests, but see PositiveIntegerGreaterThanZero integer for unit tests.
 */
export const version = PositiveIntegerGreaterThanZero;
export type Version = t.TypeOf<typeof version>;

export const versionOrUndefined = t.union([version, t.undefined]);
export type VersionOrUndefined = t.TypeOf<typeof versionOrUndefined>;
