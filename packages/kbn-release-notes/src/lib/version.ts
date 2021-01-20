/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const LABEL_RE = /^v(\d+)\.(\d+)\.(\d+)(?:-(alpha|beta)(\d+))?$/;

const versionCache = new Map<string, Version>();

const multiCompare = (...diffs: number[]) => {
  for (const diff of diffs) {
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
};

export class Version {
  static fromFlag(flag: string | string[] | boolean | undefined) {
    if (typeof flag !== 'string') {
      return;
    }

    return Version.fromLabel(flag) || Version.fromLabel(`v${flag}`);
  }

  static fromFlags(flag: string | string[] | boolean | undefined) {
    const flags = Array.isArray(flag) ? flag : [flag];
    const versions: Version[] = [];

    for (const f of flags) {
      const version = Version.fromFlag(f);
      if (!version) {
        return;
      }
      versions.push(version);
    }

    return versions;
  }

  static fromLabel(label: string) {
    const match = label.match(LABEL_RE);
    if (!match) {
      return;
    }

    const cached = versionCache.get(label);
    if (cached) {
      return cached;
    }

    const [, major, minor, patch, tag, tagNum] = match;
    const version = new Version(
      parseInt(major, 10),
      parseInt(minor, 10),
      parseInt(patch, 10),
      tag as 'alpha' | 'beta' | undefined,
      tagNum ? parseInt(tagNum, 10) : undefined
    );

    versionCache.set(label, version);
    return version;
  }

  static sort(versions: Version[], dir: 'asc' | 'desc' = 'asc') {
    const order = dir === 'asc' ? 1 : -1;

    return versions.slice().sort((a, b) => a.compare(b) * order);
  }

  public readonly label = `v${this.major}.${this.minor}.${this.patch}${
    this.tag ? `-${this.tag}${this.tagNum}` : ''
  }`;
  private readonly tagOrder: number;

  constructor(
    public readonly major: number,
    public readonly minor: number,
    public readonly patch: number,
    public readonly tag: 'alpha' | 'beta' | undefined,
    public readonly tagNum: number | undefined
  ) {
    switch (tag) {
      case undefined:
        this.tagOrder = Infinity;
        break;
      case 'alpha':
        this.tagOrder = 1;
        break;
      case 'beta':
        this.tagOrder = 2;
        break;
      default:
        throw new Error('unexpected tag');
    }
  }

  compare(other: Version) {
    return multiCompare(
      this.major - other.major,
      this.minor - other.minor,
      this.patch - other.patch,
      this.tagOrder - other.tagOrder,
      (this.tagNum ?? 0) - (other.tagNum ?? 0)
    );
  }
}
