/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getVersionsFile } from '#pipeline-utils';

import {
  getArtifactBuildTriggers,
  getArtifactSnapshotPipelineTriggers,
  getArtifactStagingPipelineTriggers,
} from './pipeline';

const versionsFile = getVersionsFile();

describe('pipeline trigger combinations', () => {
  it('should trigger the correct pipelines for "artifacts-snapshot"', () => {
    const snapshotTriggers = getArtifactSnapshotPipelineTriggers();
    // triggers for all open branches
    const branches = versionsFile.versions.map((v) => v.branch);
    expect(snapshotTriggers.length).toEqual(branches.length);

    branches.forEach((b) => {
      expect(snapshotTriggers.some((trigger) => trigger.build?.branch === b)).toBe(true);
    });
  });

  it('should trigger the correct pipelines for "artifacts-trigger"', () => {
    const triggerTriggers = getArtifactBuildTriggers();
    // all branches that have fixed versions, (i.e. [0-9].x and main)
    const branches = versionsFile.versions
      .filter((v) => v.branch.match(/[0-9]{1,2}\.[0-9]{1,2}/))
      .map((v) => v.branch);

    expect(triggerTriggers.length).toEqual(branches.length);
    branches.forEach((b) => {
      expect(triggerTriggers.some((trigger) => trigger.build?.branch === b)).toBe(true);
    });
  });

  it('should trigger the correct pipelines for "artifacts-staging"', () => {
    const stagingTriggers = getArtifactStagingPipelineTriggers();
    // all branches that have fixed versions (i.e. not [0-9].x and main)
    const branches = versionsFile.versions
      .filter((v) => v.branch.match(/[0-9]{1,2}\.[0-9]{1,2}/))
      .map((v) => v.branch);

    expect(stagingTriggers.length).toEqual(branches.length);
    branches.forEach((b) => {
      expect(stagingTriggers.some((trigger) => trigger.build?.branch === b)).toBe(true);
    });
  });
});
