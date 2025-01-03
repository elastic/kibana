/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { ML_ANOMALY_RESULT_TYPE } from '@kbn/ml-anomaly-utils';

export const jobsSelectionSchema = schema.object(
  {
    jobIds: schema.arrayOf(schema.string(), { defaultValue: [] }),
    groupIds: schema.arrayOf(schema.string(), { defaultValue: [] }),
  },
  {
    validate: (v) => {
      if (!v.jobIds?.length && !v.groupIds?.length) {
        return i18n.translate('xpack.ml.alertTypes.anomalyDetection.jobSelection.errorMessage', {
          defaultMessage: 'Job selection is required',
        });
      }
    },
  }
);

export const mlAnomalyDetectionAlertParamsSchema = schema.object({
  jobSelection: jobsSelectionSchema,
  /** Anomaly score threshold  */
  severity: schema.number({ min: 0, max: 100 }),
  /** Result type to alert upon  */
  resultType: schema.oneOf([
    schema.literal(ML_ANOMALY_RESULT_TYPE.RECORD),
    schema.literal(ML_ANOMALY_RESULT_TYPE.BUCKET),
    schema.literal(ML_ANOMALY_RESULT_TYPE.INFLUENCER),
  ]),
  includeInterim: schema.boolean({ defaultValue: true }),
  /** User's override for the lookback interval */
  lookbackInterval: schema.nullable(schema.string()),
  /** User's override for the top N buckets  */
  topNBuckets: schema.nullable(schema.number({ min: 1 })),
});
