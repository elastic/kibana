/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { responseFormatter } from './response_formatter';
import { SERVICE_KEY, SERVICE_KEY_LEGACY } from '../../../constants';
import { DataViewLazy, DataViewField } from '../../../../common';

const dataView = {
  toSpec: async () => {
    return {
      title: 'dataView',
    };
  },
} as DataViewLazy;

const fields = [
  {
    toSpec: () => {
      return {
        name: 'field',
      };
    },
  },
] as DataViewField[];

describe('responseFormatter', () => {
  it('returns correct format', async () => {
    const response = await responseFormatter({
      serviceKey: SERVICE_KEY,
      dataView,
      fields,
    });
    expect(response).toMatchSnapshot();
  });

  it('returns correct format for legacy', async () => {
    const response = await responseFormatter({
      serviceKey: SERVICE_KEY_LEGACY,
      dataView,
      fields,
    });
    expect(response).toMatchSnapshot();
  });
});
