/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { DataView } from './data_view';
import { DataViewSpec } from '../types';

/**
 * Create a custom stub index pattern. Use it in your unit tests where an {@link DataView} expected.
 * @param spec - Serialized index pattern object
 * @param opts - Specify index pattern options
 * @param deps - Optionally provide dependencies, you can provide a custom field formats implementation, by default a dummy mock is used
 *
 * @returns - an {@link DataView} instance
 *
 *
 * @example
 *
 * You can provide a custom implementation or assert calls using jest.spyOn:
 *
 * ```ts
 *  const indexPattern = createStubIndexPattern({spec: {title: 'logs-*'}});
 *  const spy = jest.spyOn(indexPattern, 'getFormatterForField');
 *
 *  // use `spy` as a regular jest mock
 *
 * ```
 */
export const createStubDataView = ({
  spec,
  opts,
  deps,
}: {
  spec: DataViewSpec;
  opts?: {
    shortDotsEnable?: boolean;
    metaFields?: string[];
  };
  deps?: {
    fieldFormats?: FieldFormatsStartCommon;
  };
}): DataView =>
  new DataView({
    spec,
    metaFields: opts?.metaFields ?? ['_id', '_type', '_source'],
    shortDotsEnable: opts?.shortDotsEnable,
    fieldFormats: deps?.fieldFormats ?? fieldFormatsMock,
  });
