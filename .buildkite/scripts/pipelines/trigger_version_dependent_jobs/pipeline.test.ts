/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-unused-expressions */

import { getVersionsFile } from '#pipeline-utils';
import { expect } from 'chai';

import {
  getArtifactBuildTriggers,
  getArtifactSnapshotPipelineTriggers,
  getESForwardPipelineTriggers,
  getArtifactStagingPipelineTriggers,
} from './pipeline';

const versionsFile = getVersionsFile();

describe('pipeline trigger combinations', () => {
  it('should trigger the correct pipelines for "es-forward"', () => {
    const esForwardTriggers = getESForwardPipelineTriggers();
    // tests 7.17 against 8.x versions
    const targets = versionsFile.versions.filter((v) => v.branch.startsWith('8.'));

    expect(esForwardTriggers.length).to.eql(targets.length);

    expect(esForwardTriggers.every((trigger) => trigger.build?.branch === '7.17')).to.be.true;

    const targetedManifests = esForwardTriggers.map((t) => t.build?.env?.ES_SNAPSHOT_MANIFEST);
    targets.forEach((t) =>
      expect(targetedManifests).to.include(
        `https://storage.googleapis.com/kibana-ci-es-snapshots-daily/${t.version}/manifest-latest-verified.json`
      )
    );
  });

  it('should trigger the correct pipelines for "artifacts-snapshot"', () => {
    const snapshotTriggers = getArtifactSnapshotPipelineTriggers();
    // triggers for all open branches
    const branches = versionsFile.versions.map((v) => v.branch);
    expect(snapshotTriggers.length).to.eql(branches.length);

    branches.forEach((b) => {
      expect(snapshotTriggers.some((trigger) => trigger.build?.branch === b)).to.be.true;
    });
  });

  it('should trigger the correct pipelines for "artifacts-trigger"', () => {
    const triggerTriggers = getArtifactBuildTriggers();
    // all branches that have fixed versions, and excluding 7.17 (i.e. not 7.17, [0-9].x and main)
    const branches = versionsFile.versions
      .filter((v) => v.branch.match(/[0-9]{1,2}\.[0-9]{1,2}/))
      .filter((v) => v.previousMajor === true)
      .map((v) => v.branch);

    expect(triggerTriggers.length).to.eql(branches.length);
    branches.forEach((b) => {
      expect(triggerTriggers.some((trigger) => trigger.build?.branch === b)).to.be.true;
    });
  });

  it('should trigger the correct pipelines for "artifacts-staging"', () => {
    const stagingTriggers = getArtifactStagingPipelineTriggers();
    // all branches that have fixed versions (i.e. not [0-9].x and main)
    const branches = versionsFile.versions
      .filter((v) => v.branch.match(/[0-9]{1,2}\.[0-9]{1,2}/))
      .map((v) => v.branch);

    expect(stagingTriggers.length).to.eql(branches.length);
    branches.forEach((b) => {
      expect(stagingTriggers.some((trigger) => trigger.build?.branch === b)).to.be.true;
    });
  });
});
