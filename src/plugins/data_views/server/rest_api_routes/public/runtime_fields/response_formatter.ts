/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewField, DataViewLazy } from '../../../../common';
import { SERVICE_KEY_LEGACY, SERVICE_KEY_TYPE, SERVICE_KEY } from '../../../constants';

interface ResponseFormatterArgs {
  serviceKey: SERVICE_KEY_TYPE;
  fields: DataViewField[];
  dataView: DataViewLazy;
}

export const responseFormatter = async ({
  serviceKey,
  fields,
  dataView,
}: ResponseFormatterArgs) => {
  const response = {
    body: {
      fields: fields.map((field) => field.toSpec()),
      [SERVICE_KEY]: await dataView.toSpec(),
    },
  };

  const legacyResponse = {
    body: {
      [SERVICE_KEY_LEGACY]: await dataView.toSpec(),
      field: fields[0].toSpec(),
    },
  };

  return serviceKey === SERVICE_KEY_LEGACY ? legacyResponse : response;
};
