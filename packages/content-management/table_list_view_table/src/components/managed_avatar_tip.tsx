/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiAvatar, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function ManagedAvatarTip({ entityName }: { entityName: string }) {
  return (
    <EuiToolTip
      content={i18n.translate('contentManagement.tableList.managedAvatarTip.avatarTooltip', {
        defaultMessage:
          'This {entityName} is created and managed by Elastic. Clone it to make changes.',
        values: {
          entityName,
        },
      })}
    >
      <EuiAvatar
        name={i18n.translate('contentManagement.tableList.managedAvatarTip.avatarLabel', {
          defaultMessage: 'Managed',
        })}
        iconType={'logoElastic'}
        iconSize={'l'}
        color="subdued"
        size={'s'}
        data-test-subj={'managedAvatarTip'}
      />
    </EuiToolTip>
  );
}
