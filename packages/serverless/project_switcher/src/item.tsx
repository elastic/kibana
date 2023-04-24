/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButtonEmpty, IconType, type EuiIconProps } from '@elastic/eui';
import { ProjectType } from '@kbn/serverless-types';

interface ItemProps extends Pick<EuiIconProps, 'type'> {
  type: ProjectType;
  onClick: (type: ProjectType, e: React.MouseEvent) => void;
  isCurrent: boolean;
}

const icons: Record<ProjectType, IconType> = {
  observability: 'logoObservability',
  security: 'logoSecurity',
  search: 'logoEnterpriseSearch',
} as const;

const labels: Record<ProjectType, string> = {
  observability: 'Observability',
  security: 'Security',
  search: 'Enterprise Search',
} as const;

export const SwitcherItem = ({ type, onClick, isCurrent }: ItemProps) => (
  <EuiButtonEmpty
    type="submit"
    iconType={icons[type]}
    onClick={(e: React.MouseEvent) => onClick(type, e)}
    flush="left"
    disabled={isCurrent}
  >
    {labels[type]}
  </EuiButtonEmpty>
);
