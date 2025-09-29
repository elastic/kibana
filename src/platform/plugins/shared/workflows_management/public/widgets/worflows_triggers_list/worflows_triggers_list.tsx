/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiText, useEuiTheme } from '@elastic/eui';
import capitalize from 'lodash/capitalize';
import React from 'react';
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
  const { euiTheme } = useEuiTheme();

  if (triggers.length === 0) {
    return (
      <EuiBadge color={euiTheme.colors.backgroundBasePlain} iconType="asterisk">
        <EuiText size="xs">No triggers</EuiText>
      </EuiBadge>
    );
  }
  const [firstTrigger, ...restOfTriggers] = triggers;

  return (
    <>
      <EuiBadge
        color={euiTheme.colors.backgroundBasePlain}
        iconType={TRIGGERS_ICONS[firstTrigger.type]}
      >
        <EuiText size="xs">{capitalize(firstTrigger.type)}</EuiText>
      </EuiBadge>
      {restOfTriggers.length > 0 && (
        <PopoverItems
          items={triggers}
          popoverTitle={i18n.TRIGGERS_LIST_TITLE}
          popoverButtonTitle={`+${restOfTriggers.length.toString()}`}
          dataTestPrefix="triggers"
          renderItem={(trigger, idx) => (
            <EuiBadge
              key={`${trigger}-${idx}`}
              color={euiTheme.colors.backgroundBasePlain}
              iconType={TRIGGERS_ICONS[trigger.type]}
            >
              <EuiText size="xs">{capitalize(trigger.type)}</EuiText>
            </EuiBadge>
          )}
        />
      )}
    </>
  );
};
