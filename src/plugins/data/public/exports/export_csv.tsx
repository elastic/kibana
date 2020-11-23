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

// Inspired by the inspector CSV exporter

import { FormatFactory } from 'src/plugins/data/common/field_formats/utils';
import { Datatable } from 'src/plugins/expressions';
import { DownloadableContent } from 'src/plugins/share/public/';

const LINE_FEED_CHARACTER = '\r\n';
const nonAlphaNumRE = /[^a-zA-Z0-9]/;
const allDoubleQuoteRE = /"/g;
export const CSV_MIME_TYPE = 'text/plain;charset=utf-8';

// TODO: enhance this later on
function escape(val: object | string, quoteValues: boolean) {
  if (val != null && typeof val === 'object') {
    val = val.valueOf();
  }

  val = String(val);

  if (quoteValues && nonAlphaNumRE.test(val)) {
    val = `"${val.replace(allDoubleQuoteRE, '""')}"`;
  }

  return val;
}

interface CSVOptions {
  csvSeparator: string;
  quoteValues: boolean;
  formatFactory: FormatFactory;
  raw?: boolean;
}

export function datatableToCSV(
  { columns, rows }: Datatable,
  { csvSeparator, quoteValues, formatFactory, raw }: Omit<CSVOptions, 'asString'>
) {
  // Build the header row by its names
  const header = columns.map((col) => escape(col.name, quoteValues));

  const formatters = columns.reduce<Record<string, ReturnType<FormatFactory>>>(
    (memo, { id, meta }) => {
      memo[id] = formatFactory(meta?.params);
      return memo;
    },
    {}
  );

  // Convert the array of row objects to an array of row arrays
  const csvRows = rows.map((row) => {
    return columns.map((column) =>
      escape(raw ? row[column.id] : formatters[column.id].convert(row[column.id]), quoteValues)
    );
  });

  return (
    [header, ...csvRows].map((row) => row.join(csvSeparator)).join(LINE_FEED_CHARACTER) +
    LINE_FEED_CHARACTER
  ); // Add \r\n after last line
}

/**
 *
 * @param filename - filename to use (either as is, or as prefix for multiple CSVs) for the files to download
 * @param datatables - data (as a dictionary of Datatable) to be translated into CSVs. It can contain multiple tables.
 * @param options - set of options for the exporter
 *
 * @returns A dictionary of files to download: the key is the filename and the value the CSV string
 */
export function exportAsCSVs(
  filename: string,
  datatables: Record<string, Datatable> | undefined,
  options: CSVOptions
) {
  if (datatables == null) {
    return;
  }
  // build a csv for datatable layer
  const csvs = Object.keys(datatables)
    .filter((layerId) => {
      return (
        datatables[layerId].columns.length &&
        datatables[layerId].rows.length &&
        datatables[layerId].rows.every((row) => Object.keys(row).length)
      );
    })
    .reduce<Record<string, string>>((memo, layerId) => {
      memo[layerId] = datatableToCSV(datatables[layerId], options);
      return memo;
    }, {});

  const layerIds = Object.keys(csvs);

  return layerIds.reduce<Record<string, Exclude<DownloadableContent, Blob>>>((memo, layerId, i) => {
    const content = csvs[layerId];
    const postFix = layerIds.length > 1 ? `-${i + 1}` : '';
    memo[`${filename}${postFix}.csv`] = { content, type: CSV_MIME_TYPE };
    return memo;
  }, {});
}
