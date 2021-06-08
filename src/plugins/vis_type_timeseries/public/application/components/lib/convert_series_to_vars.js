/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { set } from '@elastic/safer-lodash-set';
import { startsWith, snakeCase, last } from 'lodash';
import { getLastValue } from '../../../../common/last_value_utils';
import { emptyLabel } from '../../../../common/empty_label';
import { createTickFormatter } from './tick_formatter';
import { createCustomFieldFormatter } from './create_custom_field_formatter';
import { labelDateFormatter } from './label_date_formatter';
import moment from 'moment';

export const convertSeriesToVars = (
  series,
  model,
  dateFormat = 'lll',
  getConfig = null,
  fieldFormatMap
) => {
  const variables = {};
  model.series.forEach((seriesModel) => {
    series
      .filter((row) => startsWith(row.id, seriesModel.id))
      .forEach((row) => {
        const label = row.label ? snakeCase(row.label) : emptyLabel;
        const varName = [label, snakeCase(seriesModel.var_name)].filter((v) => v).join('.');

        const formatter = seriesModel.ignore_field_formatting
          ? createTickFormatter(seriesModel.formatter, seriesModel.value_template, getConfig)
          : createCustomFieldFormatter(last(seriesModel.metrics)?.field, fieldFormatMap);

        const lastValue = getLastValue(row.data);

        const data = {
          last: {
            raw: lastValue,
            formatted: formatter(lastValue),
          },
          data: {
            raw: row.data,
            formatted: row.data.map((point) => {
              return [moment(point[0]).format(dateFormat), formatter(point[1])];
            }),
          },
        };
        set(variables, varName, data);
        set(variables, `${label}.label`, row.label);

        /**
         * Handle the case when a field has "key_as_string" value.
         * Common case is the value is a date string (e.x. "2020-08-21T20:36:58.000Z") or a boolean stringified value ("true"/"false").
         * Try to convert the value into a moment object and format it with "dateFormat" from UI settings,
         * if the "key_as_string" value is recognized by a known format in Moments.js https://momentjs.com/docs/#/parsing/string/ .
         * If not, return a formatted value from elasticsearch
         */
        if (row.labelFormatted) {
          const val = labelDateFormatter(row.labelFormatted, dateFormat);
          set(variables, `${label}.formatted`, val);
        }
      });
  });
  return variables;
};
