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
import _ from 'lodash';
import numeral from '@elastic/numeral';
import { renderToStaticMarkup } from 'react-dom/server';

import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';

import { collectBranch } from './_collect_branch';

export function hierarchicalTooltipFormatter(metricFieldFormatter) {
  return function ({ datum }) {
    // Collect the current leaf and parents into an array of values
    const rows = collectBranch(datum);

    // Map those values to what the tooltipSource.rows format.
    _.forEachRight(rows, function (row) {
      row.spacer = _.escape(_.repeat('&nbsp;', row.depth));

      let percent;
      if (row.item.percentOfGroup !== null && row.item.percentOfGroup !== undefined) {
        percent = row.item.percentOfGroup;
      }

      row.metric = metricFieldFormatter ? metricFieldFormatter.convert(row.metric) : row.metric;

      if (percent !== null && percent !== undefined) {
        row.metric += ' (' + numeral(percent).format('0.[00]%') + ')';
      }

      return row;
    });

    return renderToStaticMarkup(
      <I18nProvider>
        <table className="visTooltip__table">
          <thead>
            <tr className="eui-textLeft visTooltip__label">
              <FormattedMessage
                tagName="th"
                scope="col"
                id="visTypeVislib.vislib.tooltip.fieldLabel"
                defaultMessage="field"
              />

              <FormattedMessage
                tagName="th"
                scope="col"
                id="visTypeVislib.vislib.tooltip.valueLabel"
                defaultMessage="value"
              />
              <th scope="col">{/* {metricCol.label} */}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr className="visTooltip__value" key={index}>
                <td>
                  <div className="visTooltip__labelContainer">
                    <span ng-bind-html="row.spacer" />
                    {row.field}
                  </div>
                </td>
                <td>
                  <div className="visTooltip__labelContainer">{row.bucket}</div>
                </td>
                <td>{row.metric}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </I18nProvider>
    );
  };
}
