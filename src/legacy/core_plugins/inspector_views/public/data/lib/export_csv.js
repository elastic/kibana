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

import _ from 'lodash';
import { saveAs } from '@elastic/filesaver';
import chrome from 'ui/chrome';

function buildCsv(columns, rows, valueFormatter) {
  const settings = chrome.getUiSettingsClient();
  const csvSeparator = settings.get('csv:separator', ',');
  const quoteValues = settings.get('csv:quoteValues', true);

  const nonAlphaNumRE = /[^a-zA-Z0-9]/;
  const allDoubleQuoteRE = /"/g;

  function escape(val) {
    if (_.isObject(val)) val = val.valueOf();
    val = String(val);
    if (quoteValues && nonAlphaNumRE.test(val)) {
      val = `"${val.replace(allDoubleQuoteRE, '""')}"`;
    }
    return val;
  }

  // Build the header row by its names
  const header = columns.map(col => escape(col.name));

  // Convert the array of row objects to an array of row arrays
  const orderedFieldNames = columns.map(col => col.field);
  const csvRows = rows.map(row => {
    return orderedFieldNames.map(field =>
      escape(valueFormatter ? valueFormatter(row[field]) : row[field])
    );
  });

  return [header, ...csvRows]
    .map(row => row.join(csvSeparator))
    .join('\r\n')
    + '\r\n'; // Add \r\n after last line
}

function exportAsCsv(filename, columns, rows, valueFormatter) {
  const csv = new Blob([buildCsv(columns, rows, valueFormatter)], { type: 'text/plain;charset=utf-8' });
  saveAs(csv, filename);
}

export { exportAsCsv };
