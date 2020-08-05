/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
