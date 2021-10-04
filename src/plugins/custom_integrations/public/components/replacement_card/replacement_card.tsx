/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import useAsync from 'react-use/lib/useAsync';
import { useFindService } from '../../services';

import { ReplacementCard as Component } from './replacement_card.component';

export interface Props {
  eprOverlap: string;
}

export const ReplacementCard = ({ eprOverlap }: Props) => {
  const { findReplacementIntegrations } = useFindService();
  const replacements = useAsync(async () => {
    return await findReplacementIntegrations({ shipper: 'beats', eprOverlap });
  }, [eprOverlap]);

  const { loading, value: integrations } = replacements;

  if (loading || !integrations || integrations.length === 0) {
    return null;
  }

  return <Component replacements={integrations} />;
};
