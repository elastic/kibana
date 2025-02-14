/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import type { DashboardPanelMap } from './dashboard_container/types';
import type { DashboardAttributes } from '../server/content_management';

export interface DashboardCapabilities {
  showWriteControls: boolean;
  createNew: boolean;
  show: boolean;
  [key: string]: boolean;
}

/**
 * A partially parsed version of the Dashboard Attributes used for inject and extract logic for both the Dashboard Container and the Dashboard Saved Object.
 */
export type ParsedDashboardAttributesWithType = EmbeddableStateWithType & {
  panels: DashboardPanelMap;
  type: 'dashboard';
};

export interface DashboardAttributesAndReferences {
  attributes: DashboardAttributes;
  references: Reference[];
}
