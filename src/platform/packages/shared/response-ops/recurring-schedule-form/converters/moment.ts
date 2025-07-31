/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Moment } from 'moment';
import moment from 'moment';

export const convertStringToMoment = (value: string): Moment => moment(value);

export const convertStringToMomentOptional = (value?: string): Moment | undefined =>
  value ? moment(value) : undefined;

export const convertMomentToString = (value: Moment): string => value?.toISOString();

export const convertMomentToStringOptional = (value?: Moment): string => value?.toISOString() ?? '';
