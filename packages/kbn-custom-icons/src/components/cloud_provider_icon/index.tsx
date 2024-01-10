/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiIcon, EuiIconProps } from '@elastic/eui';
import { CloudProvider, getCloudProviderIcon } from './get_cloud_provider_icon';

export interface CloudProviderIconProps extends Omit<EuiIconProps, 'type'> {
  cloudProvider?: CloudProvider;
}

export function CloudProviderIcon({ cloudProvider, ...props }: CloudProviderIconProps) {
  const computedProps: Pick<EuiIconProps, 'type' | 'title'> = {
    type: getCloudProviderIcon(cloudProvider),
  };

  if (cloudProvider) computedProps.title = cloudProvider;

  return <EuiIcon {...computedProps} {...props} />;
}
