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
    metaFields: opts?.metaFields,
    shortDotsEnable: opts?.shortDotsEnable,
    fieldFormats: deps?.fieldFormats ?? fieldFormatsMock,
  });
  return indexPattern;
};
