/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const TITLE = i18n.translate('dashboard.managedEditWarning.title', {
  defaultMessage: 'You are editing a managed dashboard',
});

const BODY = i18n.translate('dashboard.managedEditWarning.body', {
  defaultMessage:
    'Changes to managed dashboards may be overwritten when the source package or integration is upgraded.',
});

/**
 * Warning callout shown above the dashboard grid when the user is editing a
 * managed dashboard. Only rendered by callers that have already gated on
 * `viewMode === 'edit' && isManaged && allowEditingManagedDashboards`, so this
 * component focuses on local dismiss state.
 */
export const ManagedEditWarning = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <EuiCallOut
      data-test-subj="dashboardManagedEditWarning"
      title={TITLE}
      size="s"
      color="warning"
      iconType="warning"
      onDismiss={() => setDismissed(true)}
    >
      <p>{BODY}</p>
    </EuiCallOut>
  );
};
