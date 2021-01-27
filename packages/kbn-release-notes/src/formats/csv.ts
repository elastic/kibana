/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Format } from './format';

/**
 * Escape a value to conform to field and header encoding defined at https://tools.ietf.org/html/rfc4180
 */
function esc(value: string | number) {
  if (typeof value === 'number') {
    return String(value);
  }

  if (!value.includes(',') && !value.includes('\n') && !value.includes('"')) {
    return value;
  }

  return `"${value.split('"').join('""')}"`;
}

function row(...fields: Array<string | number>) {
  return fields.map(esc).join(',') + '\r\n';
}

export class CsvFormat extends Format {
  static extension = 'csv';

  *print() {
    // columns
    yield row(
      'areas',
      'versions',
      'user',
      'title',
      'number',
      'url',
      'date',
      'fixes',
      'labels',
      'state'
    );

    for (const pr of this.prs) {
      yield row(
        pr.area.title,
        pr.versions.map((v) => v.label).join(', '),
        pr.user.name || pr.user.login,
        pr.title,
        pr.number,
        pr.url,
        pr.mergedAt,
        pr.fixes.join(', '),
        pr.labels.join(', '),
        pr.state
      );
    }
  }
}
