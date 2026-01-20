/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { from } from './from';
import { inlineStats } from './inline_stats';

describe('inlineStats', () => {
  const source = from('logs-*');

  it('handles a basic INLINE STATS command', () => {
    const pipeline = source.pipe(
      inlineStats('avg_duration = AVG(transaction.duration.us) BY service.name')
    );

    expect(pipeline.toString()).toEqual(
      'FROM logs-*\n  | INLINE STATS avg_duration = AVG(transaction.duration.us) BY service.name'
    );
  });

  it('handles INLINE STATS with params', () => {
    const pipeline = source.pipe(
      inlineStats(
        '??funcName(??spanType.??fieldName.us), COUNT(??svcName) WHERE agent.name == ?agentName BY ??env',
        {
          funcName: 'AVG',
          agentName: 'java',
          spanType: 'transaction',
          fieldName: 'duration',
          svcName: 'service.name',
          env: 'service.environment',
        }
      )
    );

    expect(pipeline.toString()).toEqual(
      'FROM logs-*\n  | INLINE STATS AVG(transaction.duration.us), COUNT(service.name) WHERE agent.name == "java" BY service.environment'
    );
  });
});
