/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
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
  if (triggers.length === 0) {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="crossInCircle" size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            No triggers
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const [firstTrigger, ...restOfTriggers] = triggers;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={TRIGGERS_ICONS[firstTrigger.type]} size="s" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">{capitalize(firstTrigger.type)}</EuiText>
      </EuiFlexItem>
      {restOfTriggers.length > 0 && (
        <EuiFlexItem grow={false}>
          <PopoverItems
            items={triggers}
            popoverTitle={i18n.TRIGGERS_LIST_TITLE}
            popoverButtonTitle={`+${restOfTriggers.length.toString()}`}
            dataTestPrefix="triggers"
            renderItem={(trigger, idx) => (
              <EuiFlexGroup
                key={`${trigger.type}-${idx}`}
                alignItems="center"
                gutterSize="s"
                responsive={false}
              >
                <EuiFlexItem grow={false}>
                  <EuiIcon type={TRIGGERS_ICONS[trigger.type]} size="s" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">{capitalize(trigger.type)}</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
