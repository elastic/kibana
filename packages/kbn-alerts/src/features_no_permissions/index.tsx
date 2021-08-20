/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IconType } from '@elastic/eui';
import React, { useMemo } from 'react';

import { EmptyPage } from '../empty_page';
import * as i18n from '../translations';

interface AlertsFeatureNoPermissionsProps {
  documentationUrl: string;
  iconType: IconType;
}

export const AlertsFeatureNoPermissions: React.FC<AlertsFeatureNoPermissionsProps> = ({
  documentationUrl,
  iconType,
}): JSX.Element => {
  const actions = useMemo(
    () => ({
      feature: {
        icon: 'documents',
        label: i18n.GO_TO_DOCUMENTATION,
        url: documentationUrl,
        target: '_blank',
      },
    }),
    [documentationUrl]
  );

  return (
    <EmptyPage
      iconType={iconType}
      actions={actions}
      message={i18n.ALERTS_FEATURE_NO_PERMISSIONS_MSG}
      data-test-subj="no_feature_permissions-alerts"
      title={i18n.FEATURE_NO_PERMISSIONS_TITLE}
    />
  );
};

AlertsFeatureNoPermissions.displayName = 'AlertsFeatureNoPermissions';
