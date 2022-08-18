/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { set } from '@kbn/safer-lodash-set';
import { startsWith, snakeCase } from 'lodash';
import { BUCKET_TYPES, DATA_FORMATTERS } from '../../../../common/enums';
import { getLastValue } from '../../../../common/last_value_utils';
import { getValueOrEmpty, emptyLabel } from '../../../../common/empty_label';
import { createTickFormatter } from './tick_formatter';
import { getMetricsField } from './get_metrics_field';
import { createFieldFormatter } from './create_field_formatter';
import moment from 'moment';
import { getFieldsForTerms } from '../../../../common/fields_utils';

export const convertSeriesToVars = (series, model, getConfig = null, fieldFormatMap, dataView) => {
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

        // label might be not purely alphanumeric, wrap in brackets to map sure it's resolved correctly
        const varName = [`[${label}]`, snakeCase(seriesModel.var_name)].filter((v) => v).join('.');

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
            rowLabel = createFieldFormatter(
              fieldsForTerms[0],
              fieldFormatMap,
              undefined,
              false,
              dataView
            )(row.label);
          }
        }

        set(variables, varName, data);
        // label might be not purely alphanumeric, wrap in brackets to map sure it's resolved correctly
        set(variables, `[${label}].label`, rowLabel);
        // compatibility
        set(variables, `[${label}].formatted`, rowLabel);
      });
  });
  return variables;
};
