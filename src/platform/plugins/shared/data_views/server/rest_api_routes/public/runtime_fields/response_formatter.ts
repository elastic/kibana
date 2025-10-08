/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewField, DataViewLazy } from '../../../../common';
import type { SERVICE_KEY_TYPE } from '../../../constants';
import { SERVICE_KEY_LEGACY, SERVICE_KEY } from '../../../constants';
import { toApiSpec } from '../util/to_api_spec';

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
      [SERVICE_KEY]: toApiSpec(await dataView.toSpec()),
    },
  };

  const legacyResponse = {
    body: {
      [SERVICE_KEY_LEGACY]: toApiSpec(await dataView.toSpec()),
      field: fields[0].toSpec(),
    },
  };

  return serviceKey === SERVICE_KEY_LEGACY ? legacyResponse : response;
};
