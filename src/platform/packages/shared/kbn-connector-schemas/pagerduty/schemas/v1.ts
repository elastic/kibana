/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod';
import moment from 'moment';
import { convertTimestamp, Coerced } from '../../common/utils';

import {
  EVENT_ACTIONS_WITH_REQUIRED_DEDUPKEY,
  EVENT_ACTION_ACKNOWLEDGE,
  EVENT_ACTION_RESOLVE,
  EVENT_ACTION_TRIGGER,
} from '../constants';

const configSchemaProps = {
  apiUrl: z.string().nullable().default(null),
};
export const ConfigSchema = z.object(configSchemaProps).strict();

export const SecretsSchema = z
  .object({
    routingKey: z.string(),
  })
  .strict();

const EventActionSchema = z.enum([
  EVENT_ACTION_TRIGGER,
  EVENT_ACTION_RESOLVE,
  EVENT_ACTION_ACKNOWLEDGE,
]);

const PayloadSeveritySchema = z.enum(['critical', 'error', 'warning', 'info']);
const LinksSchema = z.array(z.object({ href: z.string(), text: z.string() }).strict());
const customDetailsSchema = Coerced(z.record(z.string(), z.any()));

export const ParamsSchema = z
  .object({
    eventAction: EventActionSchema.optional(),
    dedupKey: z.string().max(255).optional(),
    summary: z.string().max(1024).optional(),
    source: z.string().optional(),
    severity: PayloadSeveritySchema.optional(),
    timestamp: z.string().optional(),
    component: z.string().optional(),
    group: z.string().optional(),
    class: z.string().optional(),
    links: LinksSchema.optional(),
    customDetails: customDetailsSchema.optional(),
  })
  .strict()
  .superRefine((paramsObject, ctx) => {
    const { timestamp, eventAction, dedupKey } = paramsObject;
    const convertedTimestamp = convertTimestamp(timestamp);
    if (convertedTimestamp != null) {
      try {
        const date = moment(convertedTimestamp);
        if (!date.isValid()) {
          ctx.addIssue({
            code: z.ZodIssueCode.invalid_date,
            message: i18n.translate(
              'xpack.stackConnectors.pagerduty.invalidTimestampErrorMessage',
              {
                defaultMessage: `error parsing timestamp "{timestamp}"`,
                values: {
                  timestamp,
                },
              }
            ),
          });
          return;
        }
      } catch (err) {
        ctx.addIssue({
          code: z.ZodIssueCode.invalid_date,
          message: i18n.translate(
            'xpack.stackConnectors.pagerduty.timestampParsingFailedErrorMessage',
            {
              defaultMessage: `error parsing timestamp "{timestamp}": {message}`,
              values: {
                timestamp,
                message: err.message,
              },
            }
          ),
        });
      }
    }
    if (eventAction && EVENT_ACTIONS_WITH_REQUIRED_DEDUPKEY.has(eventAction) && !dedupKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: i18n.translate('xpack.stackConnectors.pagerduty.missingDedupkeyErrorMessage', {
          defaultMessage: `DedupKey is required when eventAction is "{eventAction}"`,
          values: { eventAction },
        }),
      });
    }
  });
