/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { set } from '@elastic/safer-lodash-set';
import { startsWith, snakeCase } from 'lodash';
import { BUCKET_TYPES, DATA_FORMATTERS } from '../../../../common/enums';
import { getLastValue } from '../../../../common/last_value_utils';
import { getValueOrEmpty, emptyLabel } from '../../../../common/empty_label';
import { createTickFormatter } from './tick_formatter';
import { getMetricsField } from './get_metrics_field';
import { createFieldFormatter } from './create_field_formatter';
import { labelDateFormatter } from './label_date_formatter';
import moment from 'moment';
import { getFieldsForTerms } from '../../../../common/fields_utils';

export const convertSeriesToVars = (series, model, getConfig = null, fieldFormatMap) => {
  const variables = {};
  const dateFormat = getConfig?.('dateFormat') ?? 'lll';
  model.series.forEach((seriesModel) => {
    series
      .filter((row) => startsWith(row.id, seriesModel.id))
      .forEach((row) => {
        let label = getValueOrEmpty(row.label);

        if (label !== emptyLabel) {
          label = snakeCase(label);
        }

        const varName = [label, snakeCase(seriesModel.var_name)].filter((v) => v).join('.');

        const formatter =
          seriesModel.formatter === DATA_FORMATTERS.DEFAULT
            ? createFieldFormatter(getMetricsField(seriesModel.metrics), fieldFormatMap)
            : createTickFormatter(seriesModel.formatter, seriesModel.value_template, getConfig);
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

        let rowLabel = row.label;
        if (seriesModel.split_mode === BUCKET_TYPES.TERMS) {
          const fieldsForTerms = getFieldsForTerms(seriesModel.terms_field);

          if (fieldsForTerms.length === 1) {
            rowLabel = createFieldFormatter(fieldsForTerms[0], fieldFormatMap)(row.label);
          }
        }

        set(variables, varName, data);
        set(variables, `${label}.label`, rowLabel);

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
