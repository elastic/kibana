/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sortBy } from 'lodash';
import type { AgentMark } from '../../../types/mark';

export function getAgentMarks(marks?: Record<string, number>): AgentMark[] {
  if (!marks) {
    return [];
  }

  return sortBy(
    Object.entries(marks).map(([name, ms]) => ({
      type: 'agentMark',
      id: name,
      offset: ms * 1000,
      verticalLine: true,
    })),
    'offset'
  );
}
