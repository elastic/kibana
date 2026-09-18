/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { REPO_ROOT } from '@kbn/repo-info';
import { getPackages, getPluginPackagesFilter } from '..';

const DEV_TOOL_PLUGIN_IDS = ['developerToolbar', 'inspectComponent'];

describe('getPluginPackagesFilter devTools', () => {
  const packages = getPackages(REPO_ROOT);

  it('includes developer-tools plugins by default', () => {
    const ids = packages.filter(getPluginPackagesFilter()).map((pkg) => pkg.manifest.plugin.id);

    for (const id of DEV_TOOL_PLUGIN_IDS) {
      expect(ids).toContain(id);
    }
  });

  it('excludes developer-tools plugins when selector.devTools is false', () => {
    const ids = packages
      .filter(getPluginPackagesFilter({ devTools: false }))
      .map((pkg) => pkg.manifest.plugin.id);

    for (const id of DEV_TOOL_PLUGIN_IDS) {
      expect(ids).not.toContain(id);
    }
  });
});
