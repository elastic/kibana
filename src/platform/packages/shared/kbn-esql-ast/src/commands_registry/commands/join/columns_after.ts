/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { uniqBy } from 'lodash';
import { type ESQLCommand } from '../../../types';
import type { ESQLColumnData, ESQLFieldWithMetadata } from '../../types';

export const columnsAfter = (
  command: ESQLCommand,
  previousColumns: ESQLColumnData[],
  query: string,
  joinColumns?: ESQLFieldWithMetadata[]
) => {
  return uniqBy([...(joinColumns ?? []), ...previousColumns], 'name');
};
