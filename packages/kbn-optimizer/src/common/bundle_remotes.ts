/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseKbnImportReq } from '@kbn/repo-packages';

import { Bundle } from './bundle';
import { isObj } from './ts_helpers';

export interface BundleRemote {
  readonly bundleType: string;
  readonly bundleId: string;
  readonly pkgId: string;
  readonly targets: readonly string[];
}

export class BundleRemotes {
  static fromBundles(bundles: Bundle[]) {
    return new BundleRemotes(
      bundles.map((b) => ({
        bundleType: b.type,
        bundleId: b.id,
        ...b.remoteInfo,
      }))
    );
  }

  static parseSpec(json: unknown) {
    if (typeof json !== 'string') {
      throw new Error('expected `bundleRemotes` spec to be a JSON string');
    }

    let spec;
    try {
      spec = JSON.parse(json);
    } catch (error) {
      throw new Error('`bundleRemotes` spec must be valid JSON');
    }

    if (!Array.isArray(spec)) {
      throw new Error('`bundleRemotes` spec must be an array');
    }

    return new BundleRemotes(
      spec.map((remSpec) => {
        if (!isObj(remSpec)) {
          throw new Error('`bundleRemotes[]` must be an object');
        }

        const { bundleType, bundleId, pkgId, targets } = remSpec;
        if (typeof bundleType !== 'string') {
          throw new Error('`bundleRemotes[].bundleType` must be a string');
        }

        if (typeof bundleId !== 'string') {
          throw new Error('`bundleRemotes[].bundleId` must be a string');
        }

        if (typeof pkgId !== 'string') {
          throw new Error('`bundleRemotes[].pkgId` must be a string');
        }

        if (!Array.isArray(targets) || targets.some((t) => typeof t !== 'string')) {
          throw new Error('`bundleRemotes[].targets` must be an array of strings');
        }

        return {
          bundleType,
          bundleId,
          pkgId,
          targets,
        };
      })
    );
  }

  private byPkgId: Map<string, BundleRemote>;
  constructor(private readonly remotes: BundleRemote[]) {
    this.byPkgId = new Map(remotes.map((r) => [r.pkgId, r]));

    if (this.byPkgId.size !== remotes.length) {
      const dups = remotes.filter((r) => {
        if (this.byPkgId.has(r.pkgId)) {
          this.byPkgId.delete(r.pkgId);
          return false;
        }

        return true;
      });

      throw new Error(
        `invalid remotes, the following package ids belong to more than one remote: ${dups.join(
          ', '
        )}`
      );
    }
  }

  public getForPkgId(pkgId: string) {
    return this.byPkgId.get(pkgId);
  }

  /**
   * get the import requests were are passed in, and are also valid based on our config
   */
  public unionImportReqs(importReqs: string[]) {
    return importReqs.filter((r) => {
      const parsed = parseKbnImportReq(r);
      if (!parsed) {
        return false;
      }

      const own = this.byPkgId.get(parsed.pkgId);
      if (!own) {
        return false;
      }

      return own.targets.includes(parsed.target);
    });
  }

  public getValidImportReqs(bundleIds: string[]) {
    const filter = new Set(bundleIds);
    const remotes = this.remotes.filter((r) => filter.has(r.bundleId));
    return remotes.flatMap((r) => r.targets.map((t) => (t === '' ? r.pkgId : `${r.pkgId}/${t}`)));
  }

  public toSpecJson() {
    return JSON.stringify(this.remotes);
  }
}
