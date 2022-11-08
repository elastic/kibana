/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { NonEmptyString } from '@kbn/securitysolution-io-ts-types';

export const exportExceptionDetails = {
  exported_exception_list_count: t.number,
  exported_exception_list_item_count: t.number,
  missing_exception_list_item_count: t.number,
  missing_exception_list_items: t.array(
    t.exact(
      t.type({
        item_id: NonEmptyString,
      })
    )
  ),
  missing_exception_lists: t.array(
    t.exact(
      t.type({
        list_id: NonEmptyString,
      })
    )
  ),
  missing_exception_lists_count: t.number,
};

export const exportExceptionDetailsSchema = t.exact(t.type(exportExceptionDetails));

export type ExportExceptionDetails = t.TypeOf<typeof exportExceptionDetailsSchema>;
