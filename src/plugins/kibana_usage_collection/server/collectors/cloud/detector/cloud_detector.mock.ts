/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const create = () => {
  const mock = {
    detectCloudService: jest.fn(async () => {}), // We need it to be a promise, or it'll crash because of missing `.catch`
    getCloudDetails: jest.fn(),
  };

  return mock;
};

export const cloudDetectorMock = { create };
