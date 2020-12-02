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
import { DatatableColumn, Datatable } from '../../../expressions/public';
import { BucketColumns, PieVisParams } from '../types';

export const getColumns = (visParams: PieVisParams, visData: Datatable) => {
  const bucketColumns: Array<Partial<BucketColumns>> = [];
  let metricColumn: DatatableColumn;
  if (visParams?.dimensions?.buckets) {
    visParams.dimensions.buckets.forEach((b) => {
      bucketColumns.push({ ...visData.columns[b.accessor], format: b.format });
    });
    const lastBucketId = bucketColumns[bucketColumns.length - 1].id;
    const matchingIndex = visData.columns.findIndex((col) => col.id === lastBucketId);
    metricColumn = visData.columns[matchingIndex + 1];
  } else {
    metricColumn = visData.columns[0];
    bucketColumns.push({
      name: metricColumn.name,
    });
  }
  return {
    bucketColumns,
    metricColumn,
  };
};
