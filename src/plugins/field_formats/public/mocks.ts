/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup } from '@kbn/core/public';
import { baseFormattersPublic } from './lib/constants';
import { FieldFormatsRegistry, FORMATS_UI_SETTINGS } from '../common';
import type { FieldFormatsSetup, FieldFormatsStart } from '.';
import { fieldFormatsMock } from '../common/mocks';

export const getFieldFormatsRegistry = (core: CoreSetup) => {
  const fieldFormatsRegistry = new FieldFormatsRegistry();
  const getConfig = core.uiSettings.get.bind(core.uiSettings);

  const getConfigWithFallbacks = (key: string) => {
    switch (key) {
      case FORMATS_UI_SETTINGS.FORMAT_DEFAULT_TYPE_MAP:
        return (
          getConfig(key) ??
          `{
  "ip": { "id": "ip", "params": {} },
  "date": { "id": "date", "params": {} },
  "date_nanos": { "id": "date_nanos", "params": {}, "es": true },
  "number": { "id": "number", "params": {} },
  "boolean": { "id": "boolean", "params": {} },
  "histogram": { "id": "histogram", "params": {} },
  "_source": { "id": "_source", "params": {} },
  "_default_": { "id": "string", "params": {} }
}`
        );
      default:
        return getConfig(key);
    }
  };

  fieldFormatsRegistry.init(getConfigWithFallbacks, {}, baseFormattersPublic);

  return fieldFormatsRegistry;
};

const createSetupContractMock = () => fieldFormatsMock as FieldFormatsSetup;
const createStartContractMock = () => fieldFormatsMock as FieldFormatsStart;

const createMock = () => {
  const mocked: jest.Mocked<{ start: () => FieldFormatsStart; setup: () => FieldFormatsSetup }> = {
    setup: jest.fn().mockReturnValue(createSetupContractMock()),
    start: jest.fn().mockReturnValue(createStartContractMock()),
  };

  return mocked;
};

export const fieldFormatsServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
};
