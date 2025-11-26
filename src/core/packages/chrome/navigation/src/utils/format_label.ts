/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';

/**
 * Glossary of labels that should be displayed with specific formatting.
 * Store with the exact formatting you want to display.
 */
const TITLE_CASE_GLOSSARY = [
  'Machine Learning',
  'Data Visualizer',
  'Log Rate Analysis',
  'Log Pattern Analysis',
  'Change Point Detection',
  'Index Management',
  'Index Lifecycle Policies',
  'Snapshot and Restore',
  'Rollup Jobs',
  'Data Set Quality',
  'Ingest Pipelines',
  'Logstash Pipelines',
  'Content Connectors',
  'Stack Monitoring',
  'Maintenance Windows',
  'Trained Models',
  'Anomaly Detection Jobs',
  'Data Frame Analytics Jobs',
  'GenAI Settings',
  'AI Assistants',
  'Role Mappinga',
  'Cross-Cluster Replication',
  'Remote Clusters',
  'Saved Objects',
  'Advanced Settings',
  'Data Views',
  'MITRE ATT&CK® Coverage',
  'License Management',
] as const;

const TITLE_CASE_MAP = new Map(TITLE_CASE_GLOSSARY.map((entry) => [entry.toLowerCase(), entry]));

/**
 * Formats labels with special casing rules from the glossary.
 *
 * @param children - The label to format
 * @returns [formatted label, isGlossaryTerm] - If isGlossaryTerm is false, the component should apply default capitalization styling
 * @example
 * formatLabel('machine learning') // ['Machine Learning', true] - Use as-is
 * formatLabel('settings') // ['settings', false] - Apply CSS ::first-letter transformation
 */
export const formatLabel = (children: ReactNode): [ReactNode, boolean] => {
  if (!children || typeof children !== 'string') {
    return [children, true];
  }

  const normalized = children.toLowerCase().trim();
  const glossaryMatch = TITLE_CASE_MAP.get(normalized);

  if (glossaryMatch) {
    return [glossaryMatch, true];
  }

  return [children, false];
};
