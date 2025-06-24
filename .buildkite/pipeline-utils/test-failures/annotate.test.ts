/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from 'chai';
import { Artifact } from '../buildkite/types/artifact';
import { TestFailure, getAnnotation, getSlackMessage, getPrComment } from './annotate';

let mockFailure: TestFailure;
let mockArtifacts: Record<string, Artifact>;

describe('Annotate', () => {
  beforeEach(() => {
    mockFailure = {
      url: 'https://buildkite.com/elastic/kibana-pull-request/builds/53',
      jobId: 'job-id',
      buildId: 'build-id',
      hash: 'hash',
      name: 'test should fail',
      classname: 'Chrome UI Functional Tests.test/functional/apps/console/_console·ts',
      jobName: 'OSS CI Group #1',
    } as TestFailure;

    mockArtifacts = {
      'job-idhash': {
        id: 'artifact-id',
      } as Artifact,
    };
  });

  describe('getAnnotation', () => {
    it('should create an annotation without logs link if artifact is missing', () => {
      const annotation = getAnnotation([mockFailure], {});

      expect(annotation).to.eql(
        '**Test Failures**<br />\n[[job]](https://buildkite.com/elastic/kibana-pull-request/builds/53#job-id) OSS CI Group #1 / test should fail'
      );
    });

    it('should create an annotation with logs link if artifact is present', () => {
      const annotation = getAnnotation([mockFailure], mockArtifacts);

      expect(annotation).to.eql(
        '**Test Failures**<br />\n[[job]](https://buildkite.com/elastic/kibana-pull-request/builds/53#job-id) [[logs]](https://buildkite.com/organizations/elastic/pipelines/kibana-pull-request/builds/53/jobs/job-id/artifacts/artifact-id) OSS CI Group #1 / test should fail'
      );
    });
  });

  describe('getSlackMessage', () => {
    it('should create an annotation without logs link if artifact is missing', () => {
      const annotation = getSlackMessage([mockFailure, mockFailure], {});

      expect(annotation).to.eql(
        '*Test Failures*\n' +
          '<https://buildkite.com/elastic/kibana-pull-request/builds/53#job-id|[job]> OSS CI Group #1 / test should fail\n' +
          '<https://buildkite.com/elastic/kibana-pull-request/builds/53#job-id|[job]> OSS CI Group #1 / test should fail'
      );
    });

    it('should create an annotation with logs link if artifact is present', () => {
      const annotation = getSlackMessage([mockFailure], mockArtifacts);

      expect(annotation).to.eql(
        '*Test Failures*\n<https://buildkite.com/elastic/kibana-pull-request/builds/53#job-id|[job]> <https://buildkite.com/organizations/elastic/pipelines/kibana-pull-request/builds/53/jobs/job-id/artifacts/artifact-id|[logs]> OSS CI Group #1 / test should fail'
      );
    });

    it('should create an annotation with 1 failure count if count present', () => {
      mockFailure.failureCount = 1;
      mockFailure.githubIssue = 'https://github.com/some/failure/link/1234';
      const annotation = getSlackMessage([mockFailure], mockArtifacts);

      expect(annotation).to.eql(
        '*Test Failures*\n<https://buildkite.com/elastic/kibana-pull-request/builds/53#job-id|[job]> <https://buildkite.com/organizations/elastic/pipelines/kibana-pull-request/builds/53/jobs/job-id/artifacts/artifact-id|[logs]> <https://github.com/some/failure/link/1234|[1 failure]> OSS CI Group #1 / test should fail'
      );
    });

    it('should create an annotation with 2+ failures count if count present', () => {
      mockFailure.failureCount = 2;
      mockFailure.githubIssue = 'https://github.com/some/failure/link/1234';
      const annotation = getSlackMessage([mockFailure], mockArtifacts);

      expect(annotation).to.eql(
        '*Test Failures*\n<https://buildkite.com/elastic/kibana-pull-request/builds/53#job-id|[job]> <https://buildkite.com/organizations/elastic/pipelines/kibana-pull-request/builds/53/jobs/job-id/artifacts/artifact-id|[logs]> <https://github.com/some/failure/link/1234|[2 failures]> OSS CI Group #1 / test should fail'
      );
    });
  });

  describe('getPrComment', () => {
    it('should create an annotation without logs link if artifact is missing', () => {
      const annotation = getPrComment([mockFailure], {});

      expect(annotation).to.eql(
        '### Test Failures\n* [[job]](https://buildkite.com/elastic/kibana-pull-request/builds/53#job-id) OSS CI Group #<span></span>1 / test should fail'
      );
    });

    it('should create an annotation with logs link if artifact is present', () => {
      const annotation = getPrComment([mockFailure], mockArtifacts);

      expect(annotation).to.eql(
        '### Test Failures\n* [[job]](https://buildkite.com/elastic/kibana-pull-request/builds/53#job-id) [[logs]](https://buildkite.com/organizations/elastic/pipelines/kibana-pull-request/builds/53/jobs/job-id/artifacts/artifact-id) OSS CI Group #<span></span>1 / test should fail'
      );
    });
  });
});
