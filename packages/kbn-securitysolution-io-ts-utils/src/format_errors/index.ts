/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { isObject } from 'lodash/fp';
import { i18n } from '@kbn/i18n';

export const formatErrors = (errors: t.Errors): string[] => {
  const err = errors.map((error) => {
    if (error.message != null) {
      return error.message;
    } else {
      const keyContext = error.context
        .filter(
          (entry) => entry.key != null && !Number.isInteger(+entry.key) && entry.key.trim() !== ''
        )
        .map((entry) => entry.key)
        .join(',');

      const nameContext = error.context.find(
        (entry) => entry.type != null && entry.type.name != null && entry.type.name.length > 0
      );
      const suppliedValue =
        keyContext !== '' ? keyContext : nameContext != null ? nameContext.type.name : '';
      const value = isObject(error.value) ? JSON.stringify(error.value) : error.value;
      return INVALID_VALUE_ERROR(`${value}`, suppliedValue);
    }
  });

  return [...new Set(err)];
};

const INVALID_VALUE_ERROR = (value: string, suppliedValue: string) =>
  i18n.translate('xpack.synthetics.server.projectMonitors.invalidValueError', {
    defaultMessage: 'Invalid value "{value}" supplied to "{suppliedValue}"',
    values: {
      value,
      suppliedValue,
    },
  });
