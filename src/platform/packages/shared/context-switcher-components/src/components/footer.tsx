/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiListGroup, EuiListGroupItem } from '@elastic/eui';
import type { ActionConfig } from './types';

export interface FooterProps {
  readonly action?: ActionConfig;
}

/**
 * Renders a single footer action row.
 */
export const Footer = ({ action }: FooterProps) => {
  if (!action) return null;

  return (
    <EuiListGroup>
      <EuiListGroupItem
        label={action.label}
        iconType={'plus'}
        href={action.href}
        onClick={action.onClick}
        external={action.external}
        isDisabled={action.disabled}
        color="text"
        data-test-subj={action['data-test-subj']}
      />
    </EuiListGroup>
  );
};
