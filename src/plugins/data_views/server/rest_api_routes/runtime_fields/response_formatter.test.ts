/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { responseFormatter } from './response_formatter';
import { SERVICE_KEY, SERVICE_KEY_LEGACY } from '../../constants';
import { DataView, DataViewField } from 'src/plugins/data_views/common';

const dataView = {
  toSpec: () => {
    return {
      title: 'dataView',
    };
  },
} as DataView;

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
  it('returns correct format', () => {
    const response = responseFormatter({
      serviceKey: SERVICE_KEY,
      dataView,
      fields,
    });
    expect(response).toMatchSnapshot();
  });

  it('returns correct format for legacy', () => {
    const response = responseFormatter({
      serviceKey: SERVICE_KEY_LEGACY,
      dataView,
      fields,
    });
    expect(response).toMatchSnapshot();
  });
});
