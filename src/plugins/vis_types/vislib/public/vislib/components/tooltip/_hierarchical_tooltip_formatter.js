/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import _ from 'lodash';
import numeral from '@elastic/numeral';
import { renderToStaticMarkup } from 'react-dom/server';

import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';

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
