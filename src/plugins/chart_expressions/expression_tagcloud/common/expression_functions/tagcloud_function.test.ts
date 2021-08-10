/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { tagcloudFunction } from './tagcloud_function';

import { functionWrapper } from '../../../../expressions/common/expression_functions/specs/tests/utils';
import { Datatable } from '../../../../expressions/common/expression_types/specs';

describe('interpreter/functions#tagcloud', () => {
  const fn = functionWrapper(tagcloudFunction());
  const context = {
    type: 'datatable',
    rows: [{ 'col-0-1': 0 }],
    columns: [{ id: 'col-0-1', name: 'Count' }],
  };
  const visConfig = {
    scale: 'linear',
    orientation: 'single',
    minFontSize: 18,
    maxFontSize: 72,
    showLabel: true,
    metric: { accessor: 0, format: { id: 'number' } },
    bucket: { accessor: 1, format: { id: 'number' } },
  };

  it('returns an object with the correct structure', () => {
    const actual = fn(context, visConfig, undefined);
    expect(actual).toMatchSnapshot();
  });

  it('logs correct datatable to inspector', async () => {
    let loggedTable: Datatable;
    const handlers = {
      inspectorAdapters: {
        tables: {
          logDatatable: (name: string, datatable: Datatable) => {
            loggedTable = datatable;
          },
        },
      },
    };
    await fn(context, visConfig, handlers as any);

    expect(loggedTable!).toMatchSnapshot();
  });
});
