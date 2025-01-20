/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { useDiscoverServices } from '../../../../../hooks/use_discover_services';

interface Props {
  serviceName: string;
  agentName: string;
}

export const ServiceNameLink: React.FC<Props> = ({ serviceName, agentName }: Props) => {
  const { share } = useDiscoverServices();
  const serviceLocator = share?.url.locators.get<{ serviceName: string }>('SERVICE_ENTITY_LOCATOR');

  // TODO add agent icon
  return (
    <EuiLink href={serviceLocator?.getRedirectUrl({ serviceName })} target="_blank">
      {serviceName}
    </EuiLink>
  );
};
