/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
    const targets = versionsFile.versions.filter((v) => v.currentMajor === true);

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
    // all currentMajor+prevMinor branches
    const branches = versionsFile.versions
      .filter((v) => v.currentMajor === true && v.previousMinor === true)
      .map((v) => v.branch);

    expect(triggerTriggers.length).to.eql(branches.length);
    branches.forEach((b) => {
      expect(triggerTriggers.some((trigger) => trigger.build?.branch === b)).to.be.true;
    });
  });

  it('should trigger the correct pipelines for "artifacts-staging"', () => {
    const stagingTriggers = getArtifactStagingPipelineTriggers();
    // all branches that are not currentMajor+currentMinor
    const branches = versionsFile.versions
      .filter((v) => !v.currentMajor || !v.currentMinor)
      .map((v) => v.branch);

    expect(stagingTriggers.length).to.eql(branches.length);
    branches.forEach((b) => {
      expect(stagingTriggers.some((trigger) => trigger.build?.branch === b)).to.be.true;
    });
  });
});
