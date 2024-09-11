/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const ML_APP_ID = 'ml';

export type AppId = typeof ML_APP_ID;

export type LinkId =
  | 'overview'
  | 'anomalyDetection'
  | 'anomalyExplorer'
  | 'singleMetricViewer'
  | 'dataDrift'
  | 'dataFrameAnalytics'
  | 'resultExplorer'
  | 'analyticsMap'
  | 'aiOps'
  | 'logRateAnalysis'
  | 'logPatternAnalysis'
  | 'changePointDetections'
  | 'modelManagement'
  | 'nodesOverview'
  | 'nodes'
  | 'memoryUsage'
  | 'esqlDataVisualizer'
  | 'dataVisualizer'
  | 'fileUpload'
  | 'indexDataVisualizer'
  | 'settings'
  | 'calendarSettings'
  | 'calendarSettings'
  | 'filterListsSettings'
  | 'notifications';

export type DeepLinkId = AppId | `${AppId}:${LinkId}`;
