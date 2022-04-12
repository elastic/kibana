/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Arguments, visDimension } from './vis_dimension';
import { functionWrapper } from '../../../expressions/common/expression_functions/specs/tests/utils';
import { Datatable } from '../../../expressions/common';
import moment from 'moment';

describe('interpreter/functions#vis_dimension', () => {
  const fn = functionWrapper(visDimension());
  const column1 = 'username';
  const column2 = '@timestamp';

  const input: Datatable = {
    type: 'datatable',
    columns: [
      { id: column1, name: column1, meta: { type: 'string' } },
      { id: column2, name: column2, meta: { type: 'date' } },
    ],
    rows: [
      { [column1]: 'user1', [column2]: moment().toISOString() },
      { [column1]: 'user2', [column2]: moment().toISOString() },
    ],
  };

  it('should return vis_dimension accessor in number format when type of the passed accessor is number', () => {
    const accessor = 0;
    const args: Arguments = { accessor };

    const result = fn(input, args);
    expect(result).toHaveProperty('type', 'vis_dimension');
    expect(result).toHaveProperty('accessor', accessor);
    expect(result).toHaveProperty('format');
    expect(result.format).toBeDefined();
    expect(typeof result.format === 'object').toBeTruthy();
  });

  it('should return vis_dimension accessor in DatatableColumn format when type of the passed accessor is string', () => {
    const accessor = column2;
    const args: Arguments = { accessor };
    const searchingObject = input.columns.filter(({ id }) => id === accessor)[0];

    const result = fn(input, args);
    expect(result).toHaveProperty('type', 'vis_dimension');
    expect(result).toHaveProperty('accessor');
    expect(result.accessor).toMatchObject(searchingObject);
    expect(result).toHaveProperty('format');
    expect(result.format).toBeDefined();
    expect(typeof result.format === 'object').toBeTruthy();
  });

  it('should throw error when the passed number accessor is out of columns array boundary', () => {
    const accessor = input.columns.length;
    const args: Arguments = { accessor };

    expect(() => fn(input, args)).toThrowError('Provided column name or index is invalid: 2');
  });

  it("should throw error when the passed column doesn't exist in columns", () => {
    const accessor = column1 + '_modified';
    const args: Arguments = { accessor };

    expect(() => fn(input, args)).toThrowError(
      'Provided column name or index is invalid: username_modified'
    );
  });
});
