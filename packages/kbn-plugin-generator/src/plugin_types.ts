/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';

export interface PluginType {
  thirdParty: boolean;
  installDir: string;
}

export const PLUGIN_TYPE_OPTIONS: Array<{ name: string; value: PluginType }> = [
  {
    name: 'Installable plugin',
    value: { thirdParty: true, installDir: Path.resolve(REPO_ROOT, 'plugins') },
  },
  {
    name: 'Kibana Example',
    value: { thirdParty: false, installDir: Path.resolve(REPO_ROOT, 'examples') },
  },
  {
    name: 'Kibana OSS',
    value: { thirdParty: false, installDir: Path.resolve(REPO_ROOT, 'src/plugins') },
  },
  {
    name: 'Kibana OSS Functional Testing',
    value: {
      thirdParty: false,
      installDir: Path.resolve(REPO_ROOT, 'test/plugin_functional/plugins'),
    },
  },
  {
    name: 'X-Pack',
    value: { thirdParty: false, installDir: Path.resolve(REPO_ROOT, 'x-pack/plugins') },
  },
  {
    name: 'X-Pack Functional Testing',
    value: {
      thirdParty: false,
      installDir: Path.resolve(REPO_ROOT, 'x-pack/test/plugin_functional/plugins'),
    },
  },
];
