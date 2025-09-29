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
import React from 'react';
import { css } from '@emotion/react';
import * as i18n from '../../../common/translations';
import type { WorkflowTrigger } from '../../../server/lib/schedule_utils';
import { PopoverItems } from './popover_items';
interface WorkflowsTriggersListProps {
  triggers: WorkflowTrigger[];
}

const TRIGGERS_ICONS: Record<string, string> = {
  alert: 'warning',
  manual: 'play',
  scheduled: 'clock',
};

export const WorkflowsTriggersList = ({ triggers }: WorkflowsTriggersListProps) => {
  const [first, ...rest] = triggers || [];

  // Rare edge-case: empty triggers list
  if (!first) return null;

  return (
    <>
      <EuiBadge
        color="hollow"
        iconType={TRIGGERS_ICONS[first.type]}
        css={css`
          margin: 2px 3px 0 0;
        `}
      >
        <FormattedMessage
          id={`workflows.workflowList.trigger.${first.type}`}
          defaultMessage={capitalize(first.type)}
        />
      </EuiBadge>
      {rest.length > 0 && (
        <PopoverItems
          items={triggers}
          popoverTitle={i18n.TRIGGERS_LIST_TITLE}
          popoverButtonTitle={`+${rest.length.toString()}`}
          dataTestPrefix="triggers"
          renderItem={(trigger, idx) => (
            <EuiBadge
              key={`${trigger}-${idx}`}
              color="hollow"
              iconType={TRIGGERS_ICONS[trigger.type]}
              css={css`
                margin: 2px 3px 0 0;
              `}
            >
              <FormattedMessage
                id={`workflows.workflowList.trigger.${trigger.type}`}
                defaultMessage={capitalize(trigger.type)}
              />
            </EuiBadge>
          )}
        />
      )}
    </>
  );
};
