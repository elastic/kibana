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

export type KbnWarningCalloutProps = KbnCalloutProps;

/**
 * Warning callout — Use for non-blocking issues or situations that require
 * caution before proceeding.
 */
export const KbnWarningCallout = (props: KbnWarningCalloutProps) => {
  return <EuiCallOut color="warning" {...props} />;
};
