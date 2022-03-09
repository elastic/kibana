/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const getOverallStatusChangesMock = jest.fn();
jest.doMock('./log_overall_status', () => ({
  getOverallStatusChanges: getOverallStatusChangesMock,
}));

export const getPluginsStatusChangesMock = jest.fn();
export const getServiceLevelChangeMessageMock = jest.fn();
jest.doMock('./log_plugins_status', () => ({
  getPluginsStatusChanges: getPluginsStatusChangesMock,
  getServiceLevelChangeMessage: getServiceLevelChangeMessageMock,
}));
