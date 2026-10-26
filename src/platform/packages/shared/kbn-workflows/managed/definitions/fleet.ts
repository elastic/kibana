/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isMap, parseDocument } from 'yaml';
import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from '../types';

export const FLEET_PACKAGE_WORKFLOW_ID = 'system-fleet-package-workflow';

export interface FleetPackageWorkflowTemplateValues extends ManagedWorkflowTemplateValues {
  yaml: string;
}

/** Fleet always installs package workflows disabled, whatever the package file says. */
const forceDisabled = (yaml: string): string => {
  const document = parseDocument(yaml);
  if (document.errors.length > 0 || !isMap(document.contents)) {
    throw new Error('Package workflow must be a valid YAML mapping');
  }
  document.set('enabled', false);
  return document.toString();
};

export const FLEET_PACKAGE_WORKFLOW = {
  id: FLEET_PACKAGE_WORKFLOW_ID,
  pluginId: 'fleet',
  version: 1,
  billable: false,
  visibility: { lists: ['workflows'] },
  yamlTemplate: ({ yaml }) => forceDisabled(yaml),
  management: {
    lifecycle: 'dynamic',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition<FleetPackageWorkflowTemplateValues>;
