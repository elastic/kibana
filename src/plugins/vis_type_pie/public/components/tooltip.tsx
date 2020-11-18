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

import React from 'react';
import { CustomTooltip, TooltipValue } from '@elastic/charts';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { Datatable, DatatableColumn } from '../../../expressions/public';
import { IFieldFormat } from '../../../data/public';
import { BucketColumns } from '../types';
import { getFormatService } from '../services';

import './tooltip.scss';

interface TooltipData {
  field: string;
  bucket: string;
  metric: string;
}

const getTooltipData = (
  visData: Datatable,
  metricFormatter: IFieldFormat,
  value: TooltipValue,
  columns: BucketColumns[],
  metricColumn: DatatableColumn
): TooltipData[] => {
  const data: TooltipData[] = [];
  if (!value.valueAccessor) return [];
  const bucketColumn = columns[(value.valueAccessor as number) - 1];

  // inner circle
  if (value.valueAccessor === 1) {
    return [
      {
        field: value.label,
        bucket: columns[0].name,
        metric: value.formattedValue,
      },
    ];
  }

  const matchingRow = visData.rows.find((row) => {
    const rowLabel = getFormatService()
      .deserialize(bucketColumn.format)
      .convert(row[bucketColumn.id]);
    return rowLabel === value.label && row[metricColumn.id] === value.value;
  });

  const slice = [];
  for (let i = 0; i < value.valueAccessor; i++) {
    const columnId = columns[i].id;
    const matchingIndex = visData.columns.findIndex((col) => col.id === columnId);
    const bucketColumnValue = visData.columns[matchingIndex + 1];

    const metricValue = metricFormatter.convert(matchingRow?.[bucketColumnValue.id]);
    slice.push(metricValue);

    data.push({
      field: columns[i].name,
      bucket: getFormatService().deserialize(columns[i].format).convert(matchingRow?.[columnId]),
      metric: metricValue,
    });
  }
  return data;
};

const renderData = ({ field, bucket, metric }: TooltipData, index: number) =>
  field && bucket ? (
    <tr className="visTooltip__value" key={index}>
      <td>
        <div className="visTooltip__labelContainer">
          <span ng-bind-html="row.spacer" />
          {field}
        </div>
      </td>
      <td>
        <div className="visTooltip__labelContainer">{bucket}</div>
      </td>
      <td>{metric}</td>
    </tr>
  ) : null;

export const getTooltip = (
  data: Datatable,
  metricFormatter: IFieldFormat,
  bucketColumns: BucketColumns[],
  metricColumn: DatatableColumn
): CustomTooltip => {
  return function DetailedTooltip({ values }) {
    const highlightedValue = values[0];

    if (!highlightedValue) {
      return null;
    }

    const tooltipData = getTooltipData(
      data,
      metricFormatter,
      highlightedValue,
      bucketColumns,
      metricColumn
    );

    if (tooltipData.length === 0) {
      return null;
    }

    return (
      <I18nProvider>
        <div className="detailedTooltip">
          <table className="visTooltip__table">
            <thead>
              <tr className="eui-textLeft visTooltip__label">
                <FormattedMessage
                  tagName="th"
                  id="visTypePie.tooltip.fieldLabel"
                  defaultMessage="field"
                />

                <FormattedMessage
                  tagName="th"
                  id="visTypePie.tooltip.valueLabel"
                  defaultMessage="value"
                />
                <th scope="col">{/* {metricCol.label} */}</th>
              </tr>
            </thead>
            <tbody>{tooltipData.map(renderData)}</tbody>
          </table>
        </div>
      </I18nProvider>
    );
  };
};
