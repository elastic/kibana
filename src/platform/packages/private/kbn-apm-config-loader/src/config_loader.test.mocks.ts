/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

export const getConfigurationFilePathsMock = vi.fn();
vi.doMock('./utils/get_config_file_paths', () => {
      const mocked = {
      getConfigurationFilePaths: getConfigurationFilePathsMock,
    };
      return { ...mocked, default: mocked };
    });

export const getConfigFromFilesMock = vi.fn();
vi.doMock('./utils/read_config', () => {
      const mocked = {
      getConfigFromFiles: getConfigFromFilesMock,
    };
      return { ...mocked, default: mocked };
    });

export const applyConfigOverridesMock = vi.fn();
vi.doMock('./utils/apply_config_overrides', () => {
      const mocked = {
      applyConfigOverrides: applyConfigOverridesMock,
    };
      return { ...mocked, default: mocked };
    });

export const ApmConfigurationMock = vi.fn();
vi.doMock('./config', () => {
      const mocked = {
      ApmConfiguration: ApmConfigurationMock,
    };
      return { ...mocked, default: mocked };
    });

export const resetAllMocks = () => {
  getConfigurationFilePathsMock.mockReset();
  getConfigFromFilesMock.mockReset();
  applyConfigOverridesMock.mockReset();
  ApmConfigurationMock.mockReset();
};
