/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import capitalize from 'lodash/capitalize';
import React, { useState } from 'react';
import type { WorkflowTrigger } from '../../../server/lib/schedule_utils';

interface WorkflowsTriggersListProps {
  triggers: WorkflowTrigger[];
}

const TRIGGERS_ICONS: Record<string, string> = {
  alert: 'warning',
  manual: 'play',
  scheduled: 'clock',
};

export const WorkflowsTriggersList = ({ triggers }: WorkflowsTriggersListProps) => {
  const [showAllTriggers, setShowAllTriggers] = useState<boolean>(false);

  const [first, ...rest] = triggers || [];

  // Rare edge-case: empty triggers list
  if (!first) return;

  return (
    <>
      <EuiBadge color="hollow" iconType={TRIGGERS_ICONS[first.type]}>
        <FormattedMessage
          id={`workflows.workflowList.trigger.${first.type}`}
          defaultMessage={capitalize(first.type)}
        />
      </EuiBadge>
      {rest.length > 0 ? (
        showAllTriggers ? (
          <>
            {rest.map(({ type }) => (
              <EuiBadge color="hollow" iconType={TRIGGERS_ICONS[type]}>
                <FormattedMessage
                  id={`workflows.workflowList.trigger.${type}`}
                  defaultMessage={capitalize(type)}
                />
              </EuiBadge>
            ))}
            <EuiBadge
              iconType="cross"
              onClick={() => setShowAllTriggers(false)}
              onClickAriaLabel="Show less triggers"
            />
          </>
        ) : (
          <EuiBadge
            color="hollow"
            onClick={() => setShowAllTriggers(true)}
            onClickAriaLabel="Show more triggers"
          >
            +{rest.length}
          </EuiBadge>
        )
      ) : null}
    </>
  );
};
