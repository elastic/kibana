/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagementSectionId } from '../types';
export declare const IngestSection: {
  id: ManagementSectionId;
  title: string;
  tip: string;
  order: number;
};
export declare const DataSection: {
  id: ManagementSectionId;
  title: string;
  tip: string;
  order: number;
};
export declare const InsightsAndAlertingSection: {
  id: ManagementSectionId;
  title: string;
  tip: string;
  order: number;
};
export declare const ClusterPerformanceSection: {
  id: ManagementSectionId;
  title: string;
  order: number;
};
export declare const MachineLearningSection: {
  id: ManagementSectionId;
  title: string;
  tip: string;
  order: number;
};
export declare const ModelManagementSection: {
  id: ManagementSectionId;
  title: string;
  tip: string;
  order: number;
};
export declare const SecuritySection: {
  id: string;
  title: string;
  tip: string;
  order: number;
};
export declare const KibanaSection: {
  id: ManagementSectionId;
  title: string;
  tip: string;
  order: number;
};
export declare const AISection: {
  id: ManagementSectionId;
  title: string;
  order: number;
};
export declare const StackSection: {
  id: ManagementSectionId;
  title: string;
  tip: string;
  order: number;
};
export declare const managementSections: (
  | {
      id: ManagementSectionId;
      title: string;
      order: number;
    }
  | {
      id: string;
      title: string;
      tip: string;
      order: number;
    }
)[];
