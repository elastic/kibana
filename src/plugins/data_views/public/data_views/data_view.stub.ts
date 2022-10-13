/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup } from '@kbn/core/public';
import { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
import { getFieldFormatsRegistry } from '@kbn/field-formats-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import * as commonStubs from '../../common/stubs';
import { DataView, DataViewSpec } from '../../common';
/**
 * Create a custom stub index pattern. Use it in your unit tests where an {@link DataView} expected.
 * @param spec - Serialized index pattern object
 * @param opts - Specify index pattern options
 * @param deps - Optionally provide dependencies, you can provide a custom field formats implementation, by default client side registry with real formatters implementation is used
 *
 * @returns - an {@link DataView} instance
 *
 * @remark - This is a client side version, a browser-agnostic version is available in {@link commonStubs | common}.
 * The main difference is that client side version by default uses client side field formats service, where common version uses a dummy field formats mock.
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
    core?: CoreSetup;
  };
}): DataView => {
  return commonStubs.createStubDataView({
    spec,
    opts,
    deps: {
      fieldFormats:
        deps?.fieldFormats ?? getFieldFormatsRegistry(deps?.core ?? coreMock.createSetup()),
    },
  });
};
