/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TemplateContext } from '../template_context';
import { buildDockerSHTemplate } from './build_docker_sh.template';

const context: TemplateContext = {
  artifactPrefix: 'kibana-cloud-9.7.0-SNAPSHOT',
  artifactTarball: 'kibana-cloud-9.7.0-SNAPSHOT-linux-x86_64.tar.zst',
  branch: 'main',
  imageFlavor: '-cloud',
  version: '9.7.0-SNAPSHOT',
  license: 'Elastic License',
  artifactsDir: '/kibana/target',
  dockerPush: false,
  dockerTag: null,
  dockerTagQualifier: 'abc123',
  dockerCrossCompile: false,
  imageTag: 'docker.elastic.co/kibana-ci/kibana',
  dockerBuildDir: '/kibana/build/kibana-docker/default-cloud',
  dockerTargetFilename: '/kibana/target/kibana-cloud-9.7.0-SNAPSHOT-docker-image-amd64.tar.gz',
  dockerBuildDate: '2026-10-29T00:00:00.000Z',
  publicArtifactSubdomain: 'snapshots-no-kpi',
  baseImage: 'wolfi',
  baseImageName: 'docker.elastic.co/wolfi/chainguard-base:latest',
  revision: 'abc123',
  architecture: 'x64',
  tarExt: 'tar.zst',
};

describe('buildDockerSHTemplate', () => {
  it('saves the built image as a .tar.gz archive by default', () => {
    expect(buildDockerSHTemplate.generator(context)).toContain(
      'docker save docker.elastic.co/kibana-ci/kibana-cloud:9.7.0-SNAPSHOT-abc123 | gzip -c > /kibana/target/kibana-cloud-9.7.0-SNAPSHOT-docker-image-amd64.tar.gz'
    );
  });

  it('does not save the image when skipDockerImageArchive is set', () => {
    const script = buildDockerSHTemplate.generator({ ...context, skipDockerImageArchive: true });

    expect(script).not.toContain('docker save');
    expect(script).toContain(
      'docker build -t docker.elastic.co/kibana-ci/kibana-cloud:9.7.0-SNAPSHOT-abc123'
    );
  });
});
