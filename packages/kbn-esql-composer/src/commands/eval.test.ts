/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { evaluate } from './eval';
import { from } from './from';

describe('evaluate', () => {
  const source = from('logs-*');

  it('handles single strings', () => {
    const pipeline = source.pipe(
      evaluate('type = CASE(languages <= 1, "monolingual",languages <= 2, "bilingual","polyglot")')
    );

    expect(pipeline.asString()).toEqual(
      'FROM `logs-*`\n\t| EVAL type = CASE(languages <= 1, "monolingual",languages <= 2, "bilingual","polyglot")'
    );
  });

  it('handles EVAL with params', () => {
    const pipeline = source.pipe(
      evaluate('hour = DATE_TRUNC(1 hour, ?ts)', {
        ts: {
          identifier: '@timestamp',
        },
      })
    );
    const queryRequest = pipeline.asRequest();

    expect(queryRequest.query).toEqual('FROM `logs-*`\n\t| EVAL hour = DATE_TRUNC(1 hour, ?ts)');
    expect(queryRequest.params).toEqual([
      {
        ts: {
          identifier: '@timestamp',
        },
      },
    ]);
    expect(pipeline.asString()).toEqual(
      'FROM `logs-*`\n\t| EVAL hour = DATE_TRUNC(1 hour, `@timestamp`)'
    );
  });

  it('handles chained EVAL with params', () => {
    const ids = ['aws', 'host1'];
    const pipeline = source.pipe(
      evaluate('entity.type = ?', 'host')
        .concat('entity.display_name = COALESCE(?, entity.id)', 'some_host')
        .concat(`entity.id = CONCAT(${ids.map(() => '?').join()})`, ids)
    );
    const queryRequest = pipeline.asRequest();

    expect(queryRequest.query).toEqual(
      'FROM `logs-*`\n\t| EVAL entity.type = ?, entity.display_name = COALESCE(?, entity.id), entity.id = CONCAT(?,?)'
    );
    expect(queryRequest.params).toEqual(['host', 'some_host', 'aws', 'host1']);
    expect(pipeline.asString()).toEqual(
      'FROM `logs-*`\n\t| EVAL entity.type = "host", entity.display_name = COALESCE("some_host", entity.id), entity.id = CONCAT("aws","host1")'
    );
  });
});
