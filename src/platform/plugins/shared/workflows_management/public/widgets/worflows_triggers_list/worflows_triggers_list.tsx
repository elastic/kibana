/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { capitalize } from 'lodash';
import React, { Suspense } from 'react';
import { isTriggerType } from '@kbn/workflows';
import { PopoverItems } from './popover_items';
import * as i18n from '../../../common/translations';
import type { WorkflowTrigger } from '../../../server/lib/schedule_utils';
import { triggerSchemas } from '../../trigger_schemas';

interface WorkflowsTriggersListProps {
  triggers: WorkflowTrigger[];
}

const TRIGGERS_ICONS: Record<string, string> = {
  alert: 'warning',
  manual: 'play',
  scheduled: 'clock',
};

const DEFAULT_TRIGGER_ICON = 'bolt';

function getTriggerIconType(triggerType: string): string | React.ComponentType {
  if (isTriggerType(triggerType) && TRIGGERS_ICONS[triggerType]) {
    return TRIGGERS_ICONS[triggerType];
  }
  const definition = triggerSchemas.getTriggerDefinition(triggerType);
  if (definition?.icon) {
    return definition.icon;
  }
  return DEFAULT_TRIGGER_ICON;
}

function getTriggerLabel(triggerType: string): string {
  const definition = triggerSchemas.getTriggerDefinition(triggerType);
  return definition?.title ?? capitalize(triggerType);
}

function TriggerIcon({ triggerType }: { triggerType: string }) {
  const icon = getTriggerIconType(triggerType);
  if (typeof icon === 'string') {
    return <EuiIcon type={icon} size="s" aria-hidden={true} />;
  }
  const IconComponent = icon;
  return (
    <Suspense fallback={<EuiLoadingSpinner size="s" />}>
      <EuiIcon type={IconComponent} size="s" aria-hidden={true} />
    </Suspense>
  );
}

export const WorkflowsTriggersList = ({ triggers }: WorkflowsTriggersListProps) => {
  if (triggers.length === 0) {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="crossInCircle" size="s" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {'No triggers'}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const [firstTrigger, ...restOfTriggers] = triggers;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <TriggerIcon triggerType={firstTrigger.type} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">{getTriggerLabel(firstTrigger.type)}</EuiText>
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
                  <TriggerIcon triggerType={trigger.type} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">{getTriggerLabel(trigger.type)}</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
