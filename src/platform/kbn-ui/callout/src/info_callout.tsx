/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';

import { type KbnCalloutProps } from './types';

export type KbnInfoCalloutProps = KbnCalloutProps;

/**
 * Informational callout — Use for neutral guidance, tips, or notes
 * that do not indicate a problem.
 */
export const KbnInfoCallout = (props: KbnInfoCalloutProps) => {
  return <EuiCallOut color="primary" {...props} />;
};
