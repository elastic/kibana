/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { type ESQLCommand } from '../../../types';
import type { ESQLColumnData } from '../types';
import type { IAdditionalFields } from '../registry';

export const columnsAfter = (
  command: ESQLCommand,
  _previousColumns: ESQLColumnData[], // will always be empty for TS
  _query: string,
  additionalFields: IAdditionalFields
) => {
  return additionalFields.fromFrom(command);
};
