/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { WorkflowInputDescriptor } from '../lib/describe_workflow_inputs';
import type { ResolvedWorkflowInputs } from '../lib/resolve_workflow_inputs';
import { CONFIRM_MESSAGES } from '../translations';

interface RunNoticeProps {
  descriptors: readonly WorkflowInputDescriptor[];
  resolved: ResolvedWorkflowInputs;
}

/** Says which inputs the dashboard prefilled and lists the mapped inputs it could not provide. */
export const RunNotice = ({ descriptors, resolved }: RunNoticeProps): React.JSX.Element => {
  const labelOf = (name: string) =>
    descriptors.find((descriptor) => descriptor.name === name)?.label ?? name;
  const prefilled = Object.keys(resolved.values).map(labelOf);
  const toFill = descriptors
    .filter(
      ({ name, required, defaultValue }) =>
        required && defaultValue === undefined && !(name in resolved.values)
    )
    .map(({ label }) => label);

  return (
    <div>
      <EuiText size="s" color="subdued" data-test-subj="workflowRunPanelPrefilled">
        {prefilled.length > 0
          ? CONFIRM_MESSAGES.fromDashboard(prefilled.join(', '))
          : CONFIRM_MESSAGES.runsAs}
        {toFill.length > 0 && (
          <>
            {' '}
            <strong data-test-subj="workflowRunPanelToFill">
              {CONFIRM_MESSAGES.toFill(toFill.join(', '))}
            </strong>
          </>
        )}
      </EuiText>
      {resolved.issues.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <KbnWarningCallout
            size="s"
            title={CONFIRM_MESSAGES.issuesTitle}
            data-test-subj="workflowRunPanelResolutionIssues"
          >
            <ul>
              {resolved.issues.map(({ input, message }) => (
                <li key={input}>{`${labelOf(input)}: ${message}`}</li>
              ))}
            </ul>
          </KbnWarningCallout>
        </>
      )}
    </div>
  );
};
