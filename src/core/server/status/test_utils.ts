/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ServiceStatusLevels, ServiceStatusLevel } from './types';

export const ServiceStatusLevelSnapshotSerializer: jest.SnapshotSerializerPlugin = {
  test: (val: any) => Object.values(ServiceStatusLevels).includes(val),
  serialize: (val: ServiceStatusLevel) => val.toString(),
};
