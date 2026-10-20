/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactNode } from 'react';
import { EuiCard, EuiIcon, EuiText, EuiToolTip } from '@elastic/eui';
import { checkActionTypeEnabled } from '../check_action_type_enabled';
import type { ConnectorTypeCardItem } from './get_connector_type_card_item';
import {
  DEPRECATED_LABEL,
  DEPRECATED_TOOLTIP_CONTENT,
  TECH_PREVIEW_DESCRIPTION,
  TECH_PREVIEW_LABEL,
} from './translations';

export interface ConnectorTypeCardProps {
  item: ConnectorTypeCardItem;
  onClick: () => void;
  description?: ReactNode;
  disabledReason?: string;
  size?: 'm' | 's';
}

export const ConnectorTypeCard = ({
  item,
  onClick,
  description,
  disabledReason,
  size = 'm',
}: ConnectorTypeCardProps) => {
  const enabledCheck = checkActionTypeEnabled(item.actionType);
  const tooltip = disabledReason ?? (enabledCheck.isEnabled ? undefined : enabledCheck.message);
  const body = description ?? item.selectMessage;
  const badge = item.isDeprecated
    ? {
        label: DEPRECATED_LABEL,
        tooltipContent: DEPRECATED_TOOLTIP_CONTENT,
        color: 'warning' as const,
      }
    : item.isExperimental
    ? { label: TECH_PREVIEW_LABEL, tooltipContent: TECH_PREVIEW_DESCRIPTION }
    : undefined;
  const card = (
    <EuiCard
      betaBadgeProps={badge && size === 's' ? { ...badge, size: 's' } : badge}
      role="listitem"
      titleSize="xs"
      {...(size === 's' ? { paddingSize: 's' } : {})}
      data-test-subj={`${item.actionType.id}-card`}
      icon={<EuiIcon size={size === 's' ? 'l' : 'xl'} type={item.iconClass} aria-hidden={true} />}
      title={item.name}
      description={size === 's' ? <EuiText size="xs">{body}</EuiText> : body}
      isDisabled={!enabledCheck.isEnabled || disabledReason !== undefined}
      onClick={onClick}
    />
  );
  return tooltip === undefined ? (
    card
  ) : (
    <EuiToolTip position="top" content={tooltip}>
      {card}
    </EuiToolTip>
  );
};
