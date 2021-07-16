/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { inspect } from 'util';

import { ToolingLog, kibanaPackageJson, createFailError } from '@kbn/dev-utils';
import dedent from 'dedent';

import { createUrlResolver } from './url_resolver';
import { downloadJson } from './download';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const resolveUrl = createUrlResolver(new URL('https://artifacts-api.elastic.co/v1/'));

export interface ApiPackage {
  readonly url: string;
  readonly sha_url: string;
  readonly asc_url: string;
  readonly type: string;
  readonly architecture?: string;
  readonly os?: string[];
  readonly classifier?: string;
  readonly attributes?: Record<string, unknown>;
}

interface ApiBuild {
  readonly start_time: string;
  readonly release_branch: string;
  readonly prefix: string;
  readonly end_time: string;
  readonly manifest_version: string;
  readonly version: string;
  readonly branch: string;
  readonly build_id: string;
  readonly build_duration_seconds: number;
  readonly projects: Readonly<
    Record<
      string,
      {
        readonly branch: string;
        readonly commit_hash: string;
        readonly commit_url: string;
        readonly build_duration_seconds: number;
        readonly packages: Record<string, ApiPackage>;
      }
    >
  >;
}

interface ApiBuildContainer {
  build: ApiBuild;
  manifests: {
    'last-updated-time': string;
    'seconds-since-last-update': number;
  };
}

export class SnapshotBuild {
  static async fetchMostRecentForVersion(
    log: ToolingLog,
    version: string = `${kibanaPackageJson.version}-SNAPSHOT`
  ) {
    if (!version.endsWith('-SNAPSHOT')) {
      log.warning(
        `versions usually end with -SNAPSHOT, you might want to specify version [${version}-SNAPSHOT]`
      );
    }

    log.debug('determining most recent build');
    const builds = await downloadJson(log, resolveUrl`/versions/${version}/builds`);
    const buildId = (builds.builds ?? []).shift();
    if (!buildId) {
      throw createFailError(dedent`
        no recent builds of version ${version}:

          ${JSON.stringify(builds)}
      `);
    }

    log.debug('downloading build details');
    const resp: ApiBuildContainer = await downloadJson(
      log,
      resolveUrl`/versions/${version}/builds/${buildId}`
    );
    return new SnapshotBuild(buildId, resp.build);
  }

  public readonly apmPackages = this.getPackagesForProject('apm-server').filter(
    (p) => p.type === 'tar' || p.type === 'zip'
  );

  constructor(public readonly id: string, public readonly build: ApiBuild) {}

  describeTimeSinceBuilt() {
    const buildEnd = new Date(this.build.end_time);
    const ms = Date.now() - buildEnd.valueOf();
    const days = ms / DAY;
    if (days > 7) {
      return `${(days / 7).toFixed(2)} weeks ago`;
    }
    return `${days.toFixed(2)} days ago`;
  }

  getPackagesForProject(projectName: string) {
    const project = this.build.projects[projectName];
    if (!project) {
      const debug = inspect(this.build, { depth: Infinity, colors: true });
      throw new Error(
        `Snapshot build [${this.id}] does not include a project [${projectName}]:\n${debug}`
      );
    }
    return Object.values(project.packages);
  }
}
