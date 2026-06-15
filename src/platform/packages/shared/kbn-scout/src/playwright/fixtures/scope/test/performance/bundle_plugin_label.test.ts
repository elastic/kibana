/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getLogicalBundlePluginLabel } from './bundle_plugin_label';

describe('getLogicalBundlePluginLabel', () => {
  it('maps legacy entry bundles', () => {
    expect(getLogicalBundlePluginLabel('discover.entry.js')).toBe('discover');
    expect(getLogicalBundlePluginLabel('core.entry.js')).toBe('core');
  });

  it('maps legacy chunk bundles', () => {
    expect(getLogicalBundlePluginLabel('lens.chunk.123.js')).toBe('lens');
  });

  it('maps RSPack plugin chunks', () => {
    expect(getLogicalBundlePluginLabel('plugin-discover.abcdef12.js')).toBe('discover');
    expect(getLogicalBundlePluginLabel('plugin-core.12345678.js')).toBe('core');
  });

  it('maps RSPack entry shell', () => {
    expect(getLogicalBundlePluginLabel('kibana.bundle.js')).toBe('kibana');
  });

  it('maps shared-deps npm filename', () => {
    expect(getLogicalBundlePluginLabel('kbn-ui-shared-deps-npm.dll.js')).toBe(
      'kbn-ui-shared-deps-npm'
    );
  });

  it('maps named split chunks by first segment', () => {
    expect(getLogicalBundlePluginLabel('shared-plugins.abcdef12.js')).toBe('shared-plugins');
    expect(getLogicalBundlePluginLabel('vendors.abcdef12.js')).toBe('vendors');
  });

  it('maps RSPack production numeric split chunks', () => {
    expect(getLogicalBundlePluginLabel('2511.abcdef12.js')).toBe('rspack-chunk');
    expect(getLogicalBundlePluginLabel('669.12345678.js')).toBe('rspack-chunk');
    expect(getLogicalBundlePluginLabel('98703.a1b2c3d4e5.js')).toBe('rspack-chunk');
  });
});
