/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import useAsync from 'react-use/lib/useAsync';
import { useFindService } from '../../services';

import { ReplacementCard as Component } from './replacement_card.component';

export interface Props {
  eprPackageName: string;
}

/**
 * A data-connected component which can query about Beats-based replacement options for a given EPR module.
 */
export const ReplacementCard = ({ eprPackageName }: Props) => {
  const { findReplacementIntegrations } = useFindService();
  const integrations = useAsync(async () => {
    return await findReplacementIntegrations({ shipper: 'beats', eprPackageName });
  }, [eprPackageName]);

  const { loading, value: replacements } = integrations;

  if (loading || !replacements || replacements.length === 0) {
    return null;
  }

  return <Component {...{ replacements }} />;
};
