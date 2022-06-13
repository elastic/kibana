/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { i18n } from '@kbn/i18n';
import { TextWithIcon } from '../text_with_icon';

export const txtIncompatibleTooltip = i18n.translate(
  'uiActionsEnhanced.components.TriggerLineItem.incompatibleTooltip',
  {
    defaultMessage: 'This trigger type not supported by this panel',
  }
);

export interface TriggerLineItemProps {
  tooltip?: React.ReactNode;
  incompatible?: boolean;
}

export const TriggerLineItem: React.FC<TriggerLineItemProps> = ({
  tooltip,
  incompatible,
  children,
}) => {
  return (
    <TextWithIcon
      color={'subdued'}
      tooltip={tooltip}
      icon={incompatible ? 'alert' : undefined}
      iconColor={incompatible ? 'danger' : undefined}
      iconTooltip={incompatible ? txtIncompatibleTooltip : undefined}
    >
      {children}
    </TextWithIcon>
  );
};
