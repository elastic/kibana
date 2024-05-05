/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { from } from './commands/from';
import { stats } from './commands/stats';
import { where } from './commands/where';

describe('composer', () => {
  it('applies operators in order', () => {
    expect(
      from('logs-*')
        .pipe(
          where(`@timestamp <= NOW() AND @timestamp > NOW() - 24 hours`),
          stats(`avg_duration = AVG(transaction.duration.us) BY service.name`)
        )
        .asString()
    ).toEqual(
      `FROM \`logs-*\`\n\t| WHERE @timestamp <= NOW() AND @timestamp > NOW() - 24 hours\n\t| STATS avg_duration = AVG(transaction.duration.us) BY service.name`
    );
  });
});
