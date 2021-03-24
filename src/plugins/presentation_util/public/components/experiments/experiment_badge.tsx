/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexItem, EuiBadge } from '@elastic/eui';

import { ExperimentsStrings } from '../../i18n';

const { Badge: strings } = ExperimentsStrings.Components;

import './experiment_badge.scss';

export const StatusBadge = ({ isActive }: { isActive: boolean }) => {
  return (
    <EuiFlexItem grow={false}>
      <EuiBadge className="experimentBadge__status" color={isActive ? 'hollow' : 'default'}>
        {isActive ? strings.getActiveLabel() : strings.getInactiveLabel()}
      </EuiBadge>
    </EuiFlexItem>
  );
};

export const ExperimentBadge = ({
  isEnabled,
  isActive,
}: {
  isEnabled: boolean;
  isActive: boolean;
}) => {
  if (isEnabled === isActive) {
    return <StatusBadge isActive={isActive} />;
  }

  return (
    <EuiFlexItem grow={false}>
      <EuiBadge className="experimentBadge__override" color={isEnabled ? 'secondary' : 'accent'}>
        {isEnabled ? strings.getEnabledLabel() : strings.getDisabledLabel()}
      </EuiBadge>
    </EuiFlexItem>
  );
};
