/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexPattern } from './index_pattern';
import { IndexPatternSpec } from '../types';
import { FieldFormatsStartCommon } from '../../../../field_formats/common';
import { fieldFormatsMock } from '../../../../field_formats/common/mocks';

/**
 * Create a custom stub index pattern. Use it in your unit tests where an {@link IndexPattern} expected.
 * @param spec - Serialized index pattern object
 * @param opts - Specify index pattern options
 * @param deps - Optionally provide dependencies, you can provide a custom field formats implementation, by default a dummy mock is used
 *
 * @returns - an {@link IndexPattern} instance
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
export const createStubIndexPattern = ({
  spec,
  opts,
  deps,
}: {
  spec: IndexPatternSpec;
  opts?: {
    shortDotsEnable?: boolean;
    metaFields?: string[];
  };
  deps?: {
    fieldFormats?: FieldFormatsStartCommon;
  };
}): IndexPattern => {
  const indexPattern = new IndexPattern({
    spec,
    metaFields: opts?.metaFields ?? ['_id', '_type', '_source'],
    shortDotsEnable: opts?.shortDotsEnable,
    fieldFormats: deps?.fieldFormats ?? fieldFormatsMock,
  });
  return indexPattern;
};
