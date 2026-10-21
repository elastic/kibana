/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { NIGHTSHIFT_ALERT_RECOVERY_WORKFLOW, NIGHTSHIFT_ALERT_RECOVERY_WORKFLOW_ID } from '.';
import { managedWorkflowDefinitions } from '../..';
import { WorkflowSchemaBase } from '../../../../spec/schema';
import { NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID } from '../investigation';

const workflow = parse(NIGHTSHIFT_ALERT_RECOVERY_WORKFLOW.yaml) as Record<string, any>;

describe('Nightshift alert recovery workflow', () => {
  it('validates against WorkflowSchemaBase and triggers on recovered v1 alerts', () => {
    expect(WorkflowSchemaBase.safeParse(workflow).success).toBe(true);
    expect(managedWorkflowDefinitions).toContain(NIGHTSHIFT_ALERT_RECOVERY_WORKFLOW);
    expect(NIGHTSHIFT_ALERT_RECOVERY_WORKFLOW.id).toBe(NIGHTSHIFT_ALERT_RECOVERY_WORKFLOW_ID);
    expect(workflow.triggers).toEqual([
      {
        type: 'alerting.v1.alertStatusChanged',
        on: { condition: 'event.alert.status: "recovered"' },
      },
    ]);
    expect(workflow.settings.concurrency).toEqual({
      key: 'nightshift-alert-recovery-{{ event.alert.uuid }}',
      strategy: 'queue',
      max: 1,
    });
    const [findStep, openBranch] = workflow.steps;
    expect(findStep.with).toMatchObject({
      method: 'POST',
      path: '/s/{{ workflow.spaceId }}/internal/nightshift/investigations/_alert_recovered',
      body: {
        alert_uuid: '{{ event.alert.uuid }}',
        recovered_at: '{{ event.timestamp }}',
        execution_id: '{{ execution.id }}',
      },
    });
    expect(openBranch.condition).toBe(
      '${{ steps.find_investigation.output.investigation_id != null and steps.find_investigation.output.duplicate != true }}'
    );
    // A failed follow-up fails the execution, so no step runs after it to give the recovery back.
    expect(openBranch.steps).toEqual([
      {
        name: 'investigate',
        type: 'workflow.execute',
        with: {
          'workflow-id': NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
          inputs: {
            investigation_id: '{{ steps.find_investigation.output.investigation_id }}',
            message: '${{ steps.find_investigation.output.message }}',
            context: { source: 'alert', follow_up: 'alert_recovered' },
          },
        },
      },
    ]);
  });
});
