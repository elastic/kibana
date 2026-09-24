/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getIssueMetadata } from './issue_metadata';
import { testHistoryDashboardUrl, withTestHistoryDashboardLink } from './test_history_dashboard';

const ftrFailure = {
  classname:
    'X-Pack Cloud Security Posture Functional Tests - Group 1 (Rules).x-pack/solutions/security/test/cloud_security_posture_functional/group1/pages/rules/rules_table·ts',
  name: 'Cloud Security Posture - Group 1 (Rules) Cloud Posture Rules Page - Table Rules Page - Bulk Action buttons It should disable Disable option when there are all rules selected are already Disabled',
  failure: 'NoSuchElementError',
  likelyIrrelevant: false,
  testType: 'ftr' as const,
  time: '1.0',
};

describe('testHistoryDashboardUrl', () => {
  it('matches the FTR event ID for an existing issue', () => {
    const url = testHistoryDashboardUrl(ftrFailure);
    const appState = new URLSearchParams(url?.split('?')[1]).get('_a');

    expect(url).toContain('https://ops.kibana.dev/s/ci/app/dashboards#/view/test-failure-history');
    expect(appState).toContain('test.id : "178cfea9207c0c2-dcbb0961455429b"');
    expect(appState).not.toContain('fullName');
  });

  it('uses the Scout reporter ID and escapes a title with URL punctuation', () => {
    const url = testHistoryDashboardUrl({
      ...ftrFailure,
      id: 'it!s-a-test',
      target: 'local',
      location: 'a.spec.ts',
      duration: 1,
      owners: '',
    });

    expect(new URLSearchParams(url?.split('?')[1]).get('_a')).toContain(`test.id : "it!!s-a-test"`);
    expect(url).not.toContain('fullName');
  });

  it('uses the exact Jest file for unit and integration tests', () => {
    const url = testHistoryDashboardUrl({
      ...ftrFailure,
      classname:
        'Jest Integration Tests.x-pack/platform/plugins/shared/task_manager/server/integration_tests',
      location:
        'x-pack/platform/plugins/shared/task_manager/server/integration_tests/task_cost_check.test.ts',
      name: 'Task cost checks detects tasks with cost definitions',
      testType: 'jest',
    });
    const appState = new URLSearchParams(url?.split('?')[1]).get('_a');

    expect(appState).toContain('test.id : "216c0be6ee589d4-12fee6abc92965a"');
  });

  it('omits a link when a Jest report has no exact file path', () => {
    expect(testHistoryDashboardUrl({ ...ftrFailure, testType: 'jest' })).toBeUndefined();
  });

  it('omits a link when an FTR classname only identifies a directory', () => {
    expect(
      testHistoryDashboardUrl({
        ...ftrFailure,
        classname: 'FTR Tests.x-pack/platform/test/functional/apps/maps',
      })
    ).toBeUndefined();
  });
});

describe('withTestHistoryDashboardLink', () => {
  it('adds one link before issue metadata and keeps it on subsequent updates', () => {
    const body = 'A test failed\n\n<!-- kibanaCiData = {"failed-test":{"test.failCount":2}} -->';
    const linked = withTestHistoryDashboardLink(body, ftrFailure);

    expect(linked.indexOf('Test history:')).toBeLessThan(linked.indexOf('<!-- kibanaCiData'));
    expect(getIssueMetadata(linked, 'test.failCount')).toBe(2);
    expect(withTestHistoryDashboardLink(linked, ftrFailure)).toBe(linked);

    const oldLink = linked.replace('/view/test-failure-history', '/view/ci-test-history-ftr-scout');
    expect(withTestHistoryDashboardLink(oldLink, ftrFailure)).toBe(linked);
  });
});
