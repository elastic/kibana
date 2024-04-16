/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiLink } from '@elastic/eui';
import * as React from 'react';
import { i18n } from '@kbn/i18n';
import { useConnectionDetailsService } from '@kbn/cloud/connection_details/context';

export interface KeySetupFormProps {
  loading?: boolean;
}

export const ManageKeysLink: React.FC<KeySetupFormProps> = ({loading}) => {
  const service = useConnectionDetailsService();

  const link = service.opts.apiKeys?.manageKeysLink;
  
  if (!link) return null;

  return (
    <EuiLink external href={link} target="_blank">
      {i18n.translate('cloud.connectionDetails.apiKeys.managerLinkLabel', {
        defaultMessage: 'Manage API keys',
      })}
    </EuiLink>
  );
};
