/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { FieldFormatsStart, FieldFormatsSetup, FieldFormatsService } from '.';
import { fieldFormatsMock } from '../../common/field_formats/mocks';

type FieldFormatsServiceClientContract = PublicMethodsOf<FieldFormatsService>;

const createSetupContractMock = () => fieldFormatsMock as FieldFormatsSetup;
const createStartContractMock = () => fieldFormatsMock as FieldFormatsStart;

const createMock = () => {
  const mocked: jest.Mocked<FieldFormatsServiceClientContract> = {
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
