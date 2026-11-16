/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { PlanningPhaseId, TimelineOperator } from './aggregate_esql_profile';
import { formatDurationMillis, formatShare } from './profile_format';

export const planningLabel = () =>
  i18n.translate('data.inspector.queryProfile.planningLaneLabel', { defaultMessage: 'Planning' });

export const groupLabel = (description: string): string => {
  switch (description) {
    case 'data':
      return i18n.translate('data.inspector.queryProfile.dataDriversLabel', {
        defaultMessage: 'Data',
      });
    case 'node_reduce':
      return i18n.translate('data.inspector.queryProfile.nodeReduceDriversLabel', {
        defaultMessage: 'Node reduce',
      });
    case 'final':
      return i18n.translate('data.inspector.queryProfile.finalDriversLabel', {
        defaultMessage: 'Final',
      });
    case '':
      return i18n.translate('data.inspector.queryProfile.otherDriversLabel', {
        defaultMessage: 'Other',
      });
    default:
      return description;
  }
};

export const planningPhaseLabel = (id: PlanningPhaseId): string => {
  switch (id) {
    case 'parsing':
      return i18n.translate('data.inspector.queryProfile.phaseParsingLabel', {
        defaultMessage: 'Parsing',
      });
    case 'view_resolution':
      return i18n.translate('data.inspector.queryProfile.phaseViewResolutionLabel', {
        defaultMessage: 'View resolution',
      });
    case 'dataset_resolution':
      return i18n.translate('data.inspector.queryProfile.phaseDatasetResolutionLabel', {
        defaultMessage: 'Dataset resolution',
      });
    case 'preanalysis':
      return i18n.translate('data.inspector.queryProfile.phasePreanalysisLabel', {
        defaultMessage: 'Pre-analysis',
      });
    case 'indices_resolution':
      return i18n.translate('data.inspector.queryProfile.phaseIndicesResolutionLabel', {
        defaultMessage: 'Index resolution',
      });
    case 'enrich_resolution':
      return i18n.translate('data.inspector.queryProfile.phaseEnrichResolutionLabel', {
        defaultMessage: 'Enrich resolution',
      });
    case 'inference_resolution':
      return i18n.translate('data.inspector.queryProfile.phaseInferenceResolutionLabel', {
        defaultMessage: 'Inference resolution',
      });
    case 'analysis':
      return i18n.translate('data.inspector.queryProfile.phaseAnalysisLabel', {
        defaultMessage: 'Analysis',
      });
  }
};

export const operatorTimeLabel = (operator: TimelineOperator): string =>
  operator.timeReported ? formatDurationMillis(operator.processNanos / 1e6) : '–';

export const operatorShareLabel = (operator: TimelineOperator): string =>
  operator.timeReported ? formatShare(operator.share) : '–';
