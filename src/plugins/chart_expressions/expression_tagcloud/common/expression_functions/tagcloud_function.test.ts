/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { tagcloudFunction } from './tagcloud_function';

import { functionWrapper } from '@kbn/expressions-plugin/common/expression_functions/specs/tests/utils';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/public';
import { Datatable } from '@kbn/expressions-plugin/common/expression_types/specs';
import { ScaleOptions, Orientation } from '../constants';
import { ExecutionContext } from '@kbn/expressions-plugin/common';

type Arguments = Parameters<ReturnType<typeof tagcloudFunction>['fn']>[1];

describe('interpreter/functions#tagcloud', () => {
  const fn = functionWrapper(tagcloudFunction());
  const column1 = 'Count';
  const column2 = 'country';
  const context = {
    type: 'datatable',
    columns: [
      { id: column1, name: column1 },
      { id: column2, name: column2 },
    ],
    rows: [
      { [column1]: 0, [column2]: 'US' },
      { [column1]: 10, [column2]: 'UK' },
    ],
  } as unknown as Datatable;
  const visConfig = {
    scale: ScaleOptions.LINEAR,
    orientation: Orientation.SINGLE,
    minFontSize: 18,
    maxFontSize: 72,
    showLabel: true,
  };

  const numberAccessors = {
    metric: { accessor: 0 },
    bucket: { accessor: 1 },
  };

  const stringAccessors: {
    metric: ExpressionValueVisDimension;
    bucket: ExpressionValueVisDimension;
  } = {
    metric: {
      type: 'vis_dimension',
      accessor: {
        id: column1,
        name: column1,
        meta: {
          type: 'number',
        },
      },
      format: {
        params: {},
      },
    },
    bucket: {
      type: 'vis_dimension',
      accessor: {
        id: column2,
        name: column2,
        meta: {
          type: 'string',
        },
      },
      format: {
        params: {},
      },
    },
  };

  it('returns an object with the correct structure for number accessors', () => {
    const actual = fn(context, { ...visConfig, ...numberAccessors } as Arguments);
    expect(actual).toMatchSnapshot();
  });

  it('returns an object with the correct structure for string accessors', () => {
    const actual = fn(context, { ...visConfig, ...stringAccessors } as Arguments);
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
          reset: () => {},
        },
      },
      getExecutionContext: jest.fn(),
    } as unknown as ExecutionContext;

    await fn(context, { ...visConfig, ...numberAccessors } as Arguments, handlers);

    expect(loggedTable!).toMatchSnapshot();
  });
});
