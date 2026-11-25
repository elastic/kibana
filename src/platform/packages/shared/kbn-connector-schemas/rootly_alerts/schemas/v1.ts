/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema, boundedString, unboundedString, urlString } from '@kbn/zod/v4';

import {
  EVENT_RESOLVE,
  EVENT_TRIGGER,
  MATCH_ON_CATALOG,
  MATCH_ON_CUSTOM,
  MATCH_ON_FUNCTIONALITY,
  MATCH_ON_SERVICE,
  MATCH_ON_TEAM,
  MAX_CATALOG_LENGTH,
  MAX_LABEL_NAME_LENGTH,
  MAX_LABELS,
  MAX_SECRET_LENGTH,
  MAX_TARGET_ID_LENGTH,
  MAX_WEBHOOK_URL_LENGTH,
  TARGET_TYPE_ESCALATION_POLICY,
  TARGET_TYPE_FUNCTIONALITY,
  TARGET_TYPE_SERVICE,
  TARGET_TYPE_TEAM,
  TARGET_TYPE_USER,
} from '../constants';

// Values that rule variables are rendered into have no length limit.
const ruleText = () =>
  unboundedString({
    reason:
      'Rendered from rule variables when the action runs. A length limit would fail the action and drop the alert.',
  });

export const ConfigSchema = lazySchema(() =>
  z.object({ webhookUrl: urlString({ maxLength: MAX_WEBHOOK_URL_LENGTH }) }).strict()
);

export const SecretsSchema = lazySchema(() =>
  z.object({ secret: boundedString({ minLength: 1, maxLength: MAX_SECRET_LENGTH }) }).strict()
);

const EventSchema = lazySchema(() => z.enum([EVENT_TRIGGER, EVENT_RESOLVE]));

const MatchSchema = lazySchema(() =>
  z
    .object({
      on: z.enum([
        MATCH_ON_SERVICE,
        MATCH_ON_TEAM,
        MATCH_ON_FUNCTIONALITY,
        MATCH_ON_CATALOG,
        MATCH_ON_CUSTOM,
      ]),
      catalog: boundedString({ maxLength: MAX_CATALOG_LENGTH }).optional(),
      value: ruleText().optional(),
    })
    .strict()
);

const TargetSchema = lazySchema(() =>
  z
    .object({
      type: z.enum([
        TARGET_TYPE_SERVICE,
        TARGET_TYPE_TEAM,
        TARGET_TYPE_ESCALATION_POLICY,
        TARGET_TYPE_USER,
        TARGET_TYPE_FUNCTIONALITY,
      ]),
      id: boundedString({ maxLength: MAX_TARGET_ID_LENGTH }).optional(),
    })
    .strict()
);

const LabelsSchema = lazySchema(() =>
  z
    .array(
      z
        .object({ key: boundedString({ maxLength: MAX_LABEL_NAME_LENGTH }), value: ruleText() })
        .strict()
    )
    .max(MAX_LABELS)
);

const isJsonObject = (value: string): boolean => {
  try {
    const parsed = JSON.parse(value);
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed);
  } catch {
    return false;
  }
};

export const ParamsSchema = lazySchema(() =>
  z
    .object({
      event: EventSchema.optional(),
      dedupKey: unboundedString({
        reason:
          'Defaults to the rule ID and the alert ID, and the alert ID has no length limit. Rootly decides what it accepts.',
      }).optional(),
      title: ruleText().optional(),
      description: ruleText().optional(),
      url: ruleText().optional(),
      urgency: ruleText().optional(),
      match: MatchSchema.optional(),
      target: TargetSchema.optional(),
      labels: LabelsSchema.optional(),
      customDetails: ruleText().optional(),
      ruleId: ruleText().optional(),
      ruleName: ruleText().optional(),
      alertId: ruleText().optional(),
      space: ruleText().optional(),
      evaluationTime: ruleText().optional(),
    })
    .strict()
    .superRefine((paramsObject, ctx) => {
      const event = paramsObject.event ?? EVENT_TRIGGER;

      if (event !== EVENT_TRIGGER) {
        if (!paramsObject.dedupKey?.trim()) {
          ctx.addIssue({
            code: 'custom',
            message: i18n.translate('connectors.rootlyAlerts.missingDedupKeyErrorMessage', {
              defaultMessage: 'DedupKey is required when event is "{event}"',
              values: { event },
            }),
          });
        }
        return;
      }

      if (!paramsObject.title?.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: i18n.translate('connectors.rootlyAlerts.missingTitleErrorMessage', {
            defaultMessage: 'Title is required when event is "{event}"',
            values: { event },
          }),
        });
      }

      if (paramsObject.target && !paramsObject.target.id?.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: i18n.translate('connectors.rootlyAlerts.missingTargetIdErrorMessage', {
            defaultMessage: 'Target ID is required when a target is set',
          }),
        });
      }

      if (paramsObject.customDetails && !isJsonObject(paramsObject.customDetails)) {
        ctx.addIssue({
          code: 'custom',
          message: i18n.translate('connectors.rootlyAlerts.invalidCustomDetailsErrorMessage', {
            defaultMessage: 'Custom details must be a valid JSON object',
          }),
        });
      }
    })
);
