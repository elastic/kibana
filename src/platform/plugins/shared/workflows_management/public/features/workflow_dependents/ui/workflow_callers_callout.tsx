/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiLink, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { PLUGIN_ID } from '../../../../common';
import type { WorkflowRemovalImpactResponse } from '../../../../common/lib/workflow_dependents/api';
import { useKibana } from '../../../hooks/use_kibana';
import { removalImpactQueryOptions } from '../model/removal_impact_query_options';

const MAX_LISTED_CALLERS = 10;

/** True when turning off or deleting the workflows fails other workflows. */
export const hasRemovalImpact = (data?: WorkflowRemovalImpactResponse): boolean =>
  Boolean(data && data.callers.length + data.indirect > 0);

interface WorkflowCallersCalloutProps {
  workflowCount: number;
  /** `disable` when the workflows are turned off, `delete` when they are deleted. */
  action: 'disable' | 'delete';
  data?: WorkflowRemovalImpactResponse;
}

/** Warns that workflows which run the given workflows fail once those are turned off or deleted. */
export const WorkflowCallersCallout = ({
  workflowCount,
  action,
  data,
}: WorkflowCallersCalloutProps) => {
  const { application } = useKibana().services;
  if (!data || !hasRemovalImpact(data)) {
    return null;
  }
  const { callers, indirect } = data;
  const listed = callers.slice(0, MAX_LISTED_CALLERS);

  return (
    <KbnWarningCallout
      size="s"
      title={i18n.translate('workflows.dependents.removal.title', {
        defaultMessage:
          '{count, plural, one {# workflow runs} other {# workflows run}} {workflowCount, plural, one {this workflow} other {these workflows}}',
        values: { count: callers.length, workflowCount },
      })}
      text={
        <span>
          {i18n.translate('workflows.dependents.removal.message', {
            defaultMessage:
              'Their steps that run {workflowCount, plural, one {it} other {them}} will fail once {workflowCount, plural, one {it is} other {they are}} {action, select, delete {deleted} other {turned off}}.',
            values: { workflowCount, action },
          })}
          {indirect > 0 && (
            <>
              {' '}
              <span data-test-subj="workflowCallersIndirect">
                {i18n.translate('workflows.dependents.removal.indirect', {
                  defaultMessage:
                    '{count, plural, one {# more workflow} other {# more workflows}} further up the chain {count, plural, one {runs} other {run}} those and will fail or get empty values.',
                  values: { count: indirect },
                })}
              </span>
            </>
          )}
        </span>
      }
      data-test-subj="workflowCallersCallout"
    >
      {listed.length > 0 && (
        <ul>
          {listed.map(({ id, name }) => (
            <li key={id}>
              <EuiLink
                href={application?.getUrlForApp(PLUGIN_ID, {
                  path: `/${encodeURIComponent(id)}`,
                })}
                target="_blank"
              >
                {name}
              </EuiLink>
            </li>
          ))}
          {callers.length > listed.length && (
            <li>
              {i18n.translate('workflows.dependents.removal.moreCallers', {
                defaultMessage: 'And {count} more',
                values: { count: callers.length - listed.length },
              })}
            </li>
          )}
        </ul>
      )}
    </KbnWarningCallout>
  );
};

/** Fetches and shows the workflows that fail when `workflowIds` are deleted. */
export const WorkflowCallersWarning = ({ workflowIds }: { workflowIds: string[] }) => {
  const { http } = useKibana().services;
  const { data } = useQuery(removalImpactQueryOptions(http, workflowIds));
  if (!hasRemovalImpact(data)) {
    return null;
  }
  return (
    <>
      <EuiSpacer size="s" />
      <WorkflowCallersCallout workflowCount={workflowIds.length} action="delete" data={data} />
    </>
  );
};
