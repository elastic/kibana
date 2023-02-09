/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';

import { Package } from '@kbn/repo-packages';
import { Bundle } from '../common';

const CONFIG_PATH = require.resolve('../../dist_bundle_zones.json');

interface BundleZoneManifest {
  zones: Array<{
    pkgs: string[];
  }>;
  asyncs: Array<{
    pkgs: string[];
  }>;
}

export class DistBundleZones {
  static load(packages: Package[]) {
    return new DistBundleZones(packages, JSON.parse(Fs.readFileSync(CONFIG_PATH, 'utf8')));
  }

  constructor(private readonly packages: Package[], private readonly manifest: BundleZoneManifest) {
    const unassigned = new Map(packages.map((p) => [p.id, p]));
  }
}
