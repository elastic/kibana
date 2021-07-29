/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup } from 'src/core/public';
import { baseFormattersPublic } from './lib/constants';
import { FieldFormatsRegistry } from '../common';
import type { FieldFormatsStart, FieldFormatsSetup } from '.';
import { fieldFormatsMock } from '../common/mocks';

export const getFieldFormatsRegistry = (core: CoreSetup) => {
  const fieldFormatsRegistry = new FieldFormatsRegistry();
  const getConfig = core.uiSettings.get.bind(core.uiSettings);

  fieldFormatsRegistry.init(getConfig, {}, baseFormattersPublic);

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
