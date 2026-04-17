/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { capitalize } from 'lodash';
import React, { Suspense } from 'react';
import { isTriggerType } from '@kbn/workflows';
import { PopoverItems } from './popover_items';
import * as i18n from '../../../common/translations';
import { triggerSchemas } from '../../trigger_schemas';

interface WorkflowsTriggersListProps {
  triggers: Array<{ type: string }>;
}

const TRIGGERS_ICONS: Record<string, string> = {
  alert: 'warning',
  manual: 'play',
  scheduled: 'clock',
};

const DEFAULT_TRIGGER_ICON = 'bolt';

const CONTAINER_BREAKPOINT_HIDE = '700px';

const triggersListStyles = {
  container: css({
    maxWidth: '100%',
    minWidth: 0,
  }),
  textContainer: css({
    minWidth: 0,
    overflow: 'hidden',
    flexShrink: 1,
    [`@container (max-width: ${CONTAINER_BREAKPOINT_HIDE})`]: {
      display: 'none',
    },
  }),
  text: css({
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }),
};

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
  const label = getTriggerLabel(triggerType);
  if (typeof icon === 'string') {
    return <EuiIcon type={icon} size="m" title={label} />;
  }
  const IconComponent = icon;
  return (
    <Suspense fallback={<EuiLoadingSpinner size="s" />}>
      <EuiIcon type={IconComponent} size="m" title={label} />
    </Suspense>
  );
}

export const WorkflowsTriggersList = ({ triggers }: WorkflowsTriggersListProps) => {
  if (triggers.length === 0) {
    return (
      <EuiFlexGroup
        alignItems="center"
        gutterSize="xs"
        responsive={false}
        wrap={false}
        css={triggersListStyles.container}
      >
        <EuiFlexItem grow={false}>
          <EuiIcon type="crossCircle" size="m" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={triggersListStyles.textContainer}>
          <EuiText size="s" color="subdued" css={triggersListStyles.text}>
            {'No triggers'}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const [firstTrigger, ...restOfTriggers] = triggers;

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="xs"
      responsive={false}
      wrap={false}
      css={triggersListStyles.container}
    >
      <EuiFlexItem grow={false}>
        <TriggerIcon triggerType={firstTrigger.type} />
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={triggersListStyles.textContainer}>
        <EuiText size="s" css={triggersListStyles.text}>
          {getTriggerLabel(firstTrigger.type)}
        </EuiText>
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
