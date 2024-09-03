/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getAdditionalRowControlColumns } from './get_additional_row_control_columns';
import { mockRowAdditionalLeadingControls } from '../../../../__mocks__/external_control_columns';

describe('getAdditionalRowControlColumns', () => {
  it('should work correctly for 0 controls', () => {
    const columns = getAdditionalRowControlColumns([]);

    expect(columns).toHaveLength(0);
  });

  it('should work correctly for 1 control', () => {
    const columns = getAdditionalRowControlColumns([mockRowAdditionalLeadingControls[0]]);

    expect(columns.map((column) => column.id)).toEqual([
      `additionalRowControl_${mockRowAdditionalLeadingControls[0].id}`,
    ]);
  });

  it('should work correctly for 2 controls', () => {
    const columns = getAdditionalRowControlColumns([
      mockRowAdditionalLeadingControls[0],
      mockRowAdditionalLeadingControls[1],
    ]);

    expect(columns.map((column) => column.id)).toEqual([
      `additionalRowControl_${mockRowAdditionalLeadingControls[0].id}`,
      `additionalRowControl_${mockRowAdditionalLeadingControls[1].id}`,
    ]);
  });

  it('should work correctly for 3 and more controls', () => {
    const columns = getAdditionalRowControlColumns([
      mockRowAdditionalLeadingControls[0],
      mockRowAdditionalLeadingControls[1],
      mockRowAdditionalLeadingControls[2],
    ]);

    expect(columns.map((column) => column.id)).toEqual([
      `additionalRowControl_${mockRowAdditionalLeadingControls[0].id}`,
      `additionalRowControl_menuControl`,
    ]);
  });
});
