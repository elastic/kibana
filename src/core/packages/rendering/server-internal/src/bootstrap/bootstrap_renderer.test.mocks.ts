/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

export const renderTemplateMock = vi.fn();
vi.doMock('./render_template', () => {
      const mocked = {
      renderTemplate: renderTemplateMock,
    };
      return { ...mocked, default: mocked };
    });

export const getPluginsBundlePathsMock = vi.fn();
vi.doMock('./get_plugin_bundle_paths', () => {
      const mocked = {
      getPluginsBundlePaths: getPluginsBundlePathsMock,
    };
      return { ...mocked, default: mocked };
    });

export const getRspackDependencyPathsMock = vi.fn();
vi.doMock('./get_js_dependency_paths', () => {
      const mocked = {
      getRspackDependencyPaths: getRspackDependencyPathsMock,
    };
      return { ...mocked, default: mocked };
    });
