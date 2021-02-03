/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { set } from '@elastic/safer-lodash-set';
import _ from 'lodash';
import { getLastValue } from '../../../../common/get_last_value';
import { createTickFormatter } from './tick_formatter';
import { labelDateFormatter } from './label_date_formatter';
import moment from 'moment';

export const convertSeriesToVars = (series, model, dateFormat = 'lll', getConfig = null) => {
  const variables = {};
  model.series.forEach((seriesModel) => {
    series
      .filter((row) => _.startsWith(row.id, seriesModel.id))
      .forEach((row) => {
        const varName = [_.snakeCase(row.label), _.snakeCase(seriesModel.var_name)]
          .filter((v) => v)
          .join('.');

        const formatter = createTickFormatter(
          seriesModel.formatter,
          seriesModel.value_template,
          getConfig
        );
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
        set(variables, `${_.snakeCase(row.label)}.label`, row.label);

        /**
         * Handle the case when a field has "key_as_string" value.
         * Common case is the value is a date string (e.x. "2020-08-21T20:36:58.000Z") or a boolean stringified value ("true"/"false").
         * Try to convert the value into a moment object and format it with "dateFormat" from UI settings,
         * if the "key_as_string" value is recognized by a known format in Moments.js https://momentjs.com/docs/#/parsing/string/ .
         * If not, return a formatted value from elasticsearch
         */
        if (row.labelFormatted) {
          const val = labelDateFormatter(row.labelFormatted, dateFormat);
          set(variables, `${_.snakeCase(row.label)}.formatted`, val);
        }
      });
  });
  return variables;
};
