/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Threats } from '@kbn/securitysolution-io-ts-alerting-types';
import { ThreatEuiFlexGroup } from './threat_description';

export interface ThreatDescriptionListItem {
  title: React.ReactNode;
  description: React.ReactNode;
}

export interface BuildThreatDescriptionParams {
  label: string;
  threat: Threats;
}

export const buildThreatDescription = ({
  label,
  threat,
}: BuildThreatDescriptionParams): ThreatDescriptionListItem[] => {
  if (threat.length > 0) {
    return [
      {
        title: label,
        description: <ThreatEuiFlexGroup threat={threat} />,
      },
    ];
  }
  return [];
};
