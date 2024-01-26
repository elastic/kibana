/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge, EuiBadgeProps } from '@elastic/eui';
import { AlertStatus, ALERT_STATUS_RECOVERED, ALERT_STATUS_UNTRACKED } from '@kbn/rule-data-utils';

export interface AlertLifecycleStatusBadgeProps {
  alertStatus: AlertStatus;
  flapping?: boolean | string;
}

const ACTIVE_LABEL = i18n.translate(
  'alertsUIShared.components.alertLifecycleStatusBadge.activeLabel',
  {
    defaultMessage: 'Active',
  }
);

const RECOVERED_LABEL = i18n.translate(
  'alertsUIShared.components.alertLifecycleStatusBadge.recoveredLabel',
  {
    defaultMessage: 'Recovered',
  }
);

const FLAPPING_LABEL = i18n.translate(
  'alertsUIShared.components.alertLifecycleStatusBadge.flappingLabel',
  {
    defaultMessage: 'Flapping',
  }
);

const UNTRACKED_LABEL = i18n.translate(
  'alertsUIShared.components.alertLifecycleStatusBadge.untrackedLabel',
  {
    defaultMessage: 'Untracked',
  }
);

interface BadgeProps {
  label: string;
  color: string;
  isDisabled?: boolean;
  iconProps?: {
    iconType: EuiBadgeProps['iconType'];
  };
}

const getBadgeProps = (alertStatus: AlertStatus, flapping: boolean | undefined): BadgeProps => {
  if (alertStatus === ALERT_STATUS_UNTRACKED) {
    return { label: UNTRACKED_LABEL, color: 'default', isDisabled: true };
  }

  // Prefer recovered over flapping
  if (alertStatus === ALERT_STATUS_RECOVERED) {
    return {
      label: RECOVERED_LABEL,
      color: 'success',
    };
  }

  if (flapping) {
    return {
      label: FLAPPING_LABEL,
      color: 'danger',
      iconProps: {
        iconType: 'visGauge',
      },
    };
  }

  return {
    label: ACTIVE_LABEL,
    color: 'danger',
  };
};

const castFlapping = (flapping: boolean | string | undefined) => {
  if (typeof flapping === 'string') {
    return flapping === 'true';
  }
  return flapping;
};

export const AlertLifecycleStatusBadge = memo((props: AlertLifecycleStatusBadgeProps) => {
  const { alertStatus, flapping } = props;

  const castedFlapping = castFlapping(flapping);

  const { label, color, iconProps, isDisabled } = getBadgeProps(alertStatus, castedFlapping);

  return (
    <EuiBadge
      data-test-subj="alertLifecycleStatusBadge"
      isDisabled={isDisabled}
      color={color}
      {...iconProps}
    >
      {label}
    </EuiBadge>
  );
});
