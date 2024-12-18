/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const renderTemplateMock = jest.fn();
jest.doMock('./render_template', () => ({
  renderTemplate: renderTemplateMock,
}));

export const getThemeTagMock = jest.fn();
jest.doMock('./get_theme_tag', () => ({
  getThemeTag: getThemeTagMock,
}));

export const getPluginsBundlePathsMock = jest.fn();
jest.doMock('./get_plugin_bundle_paths', () => ({
  getPluginsBundlePaths: getPluginsBundlePathsMock,
}));

export const getJsDependencyPathsMock = jest.fn();
jest.doMock('./get_js_dependency_paths', () => ({
  getJsDependencyPaths: getJsDependencyPathsMock,
}));
