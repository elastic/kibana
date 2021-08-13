/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup } from 'kibana/public';
import { FieldFormatsStartCommon } from '../../../../field_formats/common';
import { getFieldFormatsRegistry } from '../../../../field_formats/public/mocks';
import * as commonStubs from '../../../common/stubs';
import { IndexPattern, IndexPatternSpec } from '../../../common';
import { coreMock } from '../../../../../core/public/mocks';

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
    core?: CoreSetup;
  };
}): IndexPattern => {
  return commonStubs.createStubIndexPattern({
    spec,
    opts,
    deps: {
      fieldFormats:
        deps?.fieldFormats ?? getFieldFormatsRegistry(deps?.core ?? coreMock.createSetup()),
    },
  });
};
