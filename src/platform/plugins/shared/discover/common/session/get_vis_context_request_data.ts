/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AS_CODE_DATA_VIEW_SPEC_TYPE,
  AS_CODE_ESQL_DATA_SOURCE_TYPE,
} from '@kbn/as-code-data-views-schema';
import type { DiscoverSessionApiEsqlTab, DiscoverSessionApiTab } from '../../server';
import { extractEsqlFingerprint } from './extract_esql_fingerprint';

/** Rebuilds the chart fingerprint from its ES|QL attributes, falling back to available tab fields. */
export const getVisContextRequestData = (tab: DiscoverSessionApiTab) => {
  const esqlFingerprint = tab.vis_context
    ? extractEsqlFingerprint(tab.vis_context.attributes)
    : undefined;

  if (esqlFingerprint) {
    return {
      dataViewId: esqlFingerprint.dataViewId,
      ...(esqlFingerprint.timeField !== undefined && { timeField: esqlFingerprint.timeField }),
      ...(tab.breakdown_field !== undefined &&
        tab.breakdown_field !== '' && { breakdownField: tab.breakdown_field }),
    };
  }

  const dataViewId =
    tab.data_source.type !== AS_CODE_DATA_VIEW_SPEC_TYPE && 'ref_id' in tab.data_source
      ? tab.data_source.ref_id
      : undefined;
  const timeField =
    tab.data_source.type === AS_CODE_DATA_VIEW_SPEC_TYPE && 'time_field' in tab.data_source
      ? tab.data_source.time_field
      : undefined;

  return {
    ...(dataViewId !== undefined && { dataViewId }),
    ...(timeField !== undefined && { timeField }),
    ...(!isEsqlTab(tab) &&
      tab.chart_interval !== undefined && { timeInterval: tab.chart_interval }),
    ...(tab.breakdown_field !== undefined &&
      tab.breakdown_field !== '' && { breakdownField: tab.breakdown_field }),
  };
};

const isEsqlTab = (tab: DiscoverSessionApiTab): tab is DiscoverSessionApiEsqlTab =>
  tab.data_source.type === AS_CODE_ESQL_DATA_SOURCE_TYPE;
