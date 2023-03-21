/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { wrapFieldNameOnDot } from './wrap_field_name_on_dot';

describe('UnifiedFieldList wrapFieldNameOnDot()', () => {
  it(`should work correctly for simple names`, () => {
    expect(wrapFieldNameOnDot(dataView.getFieldByName('extension')?.name)).toBe('extension');
  });

  it(`should work correctly for longer names`, () => {
    expect(wrapFieldNameOnDot(dataView.getFieldByName('extension.keyword')?.name)).toBe(
      'extension.​keyword'
    );
  });
});
