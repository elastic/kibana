/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { filter } from 'rxjs/operators';

import { ToolingLog, kibanaPackageJson } from '@kbn/dev-utils';
import { firstValueFrom } from '@kbn/std';

import { ArchiveArtifact } from './archive_artifact';
import { ApmServerInstallation, ApmServerConfig } from './apm_server_installation';

interface StartOptions {
  name?: string;
  branch?: string;
  staging?: boolean;
  config?: ApmServerConfig;
}

export class ApmServer {
  constructor(private readonly log: ToolingLog) {}

  async start(options: StartOptions) {
    const branch = options.branch || kibanaPackageJson.branch;
    const staging = !!options.staging;

    const artifact = staging
      ? await ArchiveArtifact.fromStaging(this.log)
      : await ArchiveArtifact.forBranch(this.log, branch);

    this.log.info('ensuring updated artifact is downloaded');
    this.log.indent(4);
    await artifact.ensureDownloaded();
    this.log.success('artifact downloaded to', artifact.path);
    this.log.indent(-4);

    const installation = new ApmServerInstallation(
      this.log,
      options.name ?? 'apm-server',
      artifact
    );
    this.log.info('installing apm-server');
    this.log.indent(4);
    await installation.extract();
    await installation.configureInstall(options.config);
    this.log.success('apm-server installed to', installation.dir);
    this.log.indent(-4);

    this.log.info('starting apm-server');
    this.log.indent(4);
    const proc = installation.run({
      shouldRunForever: true,
    });

    // wait for the running install to be ready and then return the process object
    await firstValueFrom(proc.getState$().pipe(filter((s) => s.type === 'ready')));

    return proc;
  }
}
