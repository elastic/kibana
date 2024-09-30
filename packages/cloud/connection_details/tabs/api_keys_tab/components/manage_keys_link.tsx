/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { i18n } from '@kbn/i18n';
import { useConnectionDetailsService } from '../../../context';
import { SpaNoRouterLink } from '../../../components/spa_no_router_link';

export const ManageKeysLink: React.FC = () => {
  const service = useConnectionDetailsService();

  const link = service.opts.apiKeys?.manageKeysLink;

  if (!link) return null;

  return (
    <SpaNoRouterLink
      url={link}
      go={() => {
        service.emitTelemetryEvent(['manage_api_keys_clicked']);
        service.opts?.navigateToUrl?.(link);
      }}
      data-test-subj={'connectionDetailsManageApiKeysLink'}
    >
      {i18n.translate('cloud.connectionDetails.apiKeys.managerLinkLabel', {
        defaultMessage: 'Manage API keys',
      })}
    </SpaNoRouterLink>
  );
};
