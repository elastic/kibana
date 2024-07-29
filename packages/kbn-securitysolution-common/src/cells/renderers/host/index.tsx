/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { SyntheticEvent } from 'react';
import { EuiLink } from '@elastic/eui';

interface HostDetailsButtonProps {
  children?: React.ReactNode;
  value?: string;
  onClick?: (e: SyntheticEvent) => void;
  title?: string;
}

export const HostDetailsButton: React.FC<HostDetailsButtonProps> = ({
  children,
  onClick,
  title,
}) => {
  return (
    <EuiLink data-test-subj="host-details-button" onClick={onClick} title={title ?? 'Host Details'}>
      {children}
    </EuiLink>
  );
};
