/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IShipper } from '../types';
import { shippersMock } from '../../shippers/mocks';

export const shipperMock: jest.Mocked<IShipper> = shippersMock.createShipper();

export const uiShipperFactory = jest.fn().mockImplementation(() => ({
  ElasticV3UIShipper: jest.fn().mockImplementation(() => shipperMock),
}));

jest.doMock('./ui_shipper', uiShipperFactory);

export const serverShipperFactory = jest.fn().mockImplementation(() => ({
  ElasticV3ServerShipper: jest.fn().mockImplementation(() => shipperMock),
}));

jest.doMock('./server_shipper', serverShipperFactory);
