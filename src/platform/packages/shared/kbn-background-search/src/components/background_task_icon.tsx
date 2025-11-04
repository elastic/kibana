/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { EuiIcon, EuiNotificationBadge } from '@elastic/eui';
import React from 'react';

export const BackgroundTaskIcon = ({
  inProgressSearches,
}: {
  inProgressSearches: number | undefined;
}) => {
  if (!inProgressSearches) {
    return <EuiIcon type="backgroundTask" />;
  }

  return (
    <div style={{ position: 'relative' }}>
      <EuiIcon type="backgroundTask" />
      <div style={{ position: 'absolute', top: -8, right: -8 }}>
        <EuiNotificationBadge color="subdued">{inProgressSearches}</EuiNotificationBadge>
      </div>
    </div>
  );
};
