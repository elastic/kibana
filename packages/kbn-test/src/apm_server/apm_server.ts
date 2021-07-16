/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog, kibanaPackageJson } from '@kbn/dev-utils';

import { ArchiveArtifact } from './archive_artifact';
import { ApmServerInstall, ApmServerConfig } from './apm_server_install';

export class ApmServer {
  constructor(private readonly log: ToolingLog) {}

  async run(options: {
    name?: string;
    branch?: string;
    staging?: boolean;
    config?: ApmServerConfig;
  }) {
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

    const node = new ApmServerInstall(this.log, options.name ?? 'apm-server', artifact);
    this.log.info('installing apm-server');
    this.log.indent(4);
    await node.extract();
    await node.configureInstall(options.config);
    this.log.success('apm-server installed to', node.dir);
    this.log.indent(-4);

    this.log.info('running apm-server');
    this.log.indent(4);
    await node.run();
  }
}
