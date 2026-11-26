/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from '../types';

export const DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW_ID =
  'system-digital-experience-scorecard-report';

export const DIGITAL_EXPERIENCE_REPORT_FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY'] as const;
export type DigitalExperienceReportFrequency =
  (typeof DIGITAL_EXPERIENCE_REPORT_FREQUENCIES)[number];

export const DIGITAL_EXPERIENCE_REPORT_WEEKDAYS = [
  'MO',
  'TU',
  'WE',
  'TH',
  'FR',
  'SA',
  'SU',
] as const;
export type DigitalExperienceReportWeekday = (typeof DIGITAL_EXPERIENCE_REPORT_WEEKDAYS)[number];

export interface DigitalExperienceScorecardReportTemplateValues
  extends ManagedWorkflowTemplateValues {
  name: string;
  serviceName: string;
  environment?: string;
  lookbackDays: number;
  frequency: DigitalExperienceReportFrequency;
  /** Used when `frequency === 'WEEKLY'`. */
  weekday?: DigitalExperienceReportWeekday;
  /** Day of month (1..28) used when `frequency === 'MONTHLY'`. */
  monthday?: number;
  /** Hour (0..23) in `timeZone`. */
  hour: number;
  /** Minute (0..59). */
  minute: number;
  /** IANA time zone name (e.g. `'UTC'`). */
  timeZone: string;
  connectorId: string;
  recipients: string[];
}

const quoted = (value: string): string => JSON.stringify(value);

const renderScorecardReportYaml = ({
  name,
  serviceName,
  environment,
  lookbackDays,
  frequency,
  weekday,
  monthday,
  hour,
  minute,
  timeZone,
  connectorId,
  recipients,
}: DigitalExperienceScorecardReportTemplateValues): string => {
  const scope = environment ? `${serviceName} (${environment})` : serviceName;
  const rruleLines = [
    `        freq: ${frequency}`,
    '        interval: 1',
    `        tzid: ${quoted(timeZone)}`,
    ...(frequency === 'WEEKLY' ? [`        byweekday: [${quoted(weekday ?? 'MO')}]`] : []),
    ...(frequency === 'MONTHLY' ? [`        bymonthday: [${monthday ?? 1}]`] : []),
    `        byhour: [${hour}]`,
    `        byminute: [${minute}]`,
  ];

  // User-supplied strings live in `consts` so Liquid resolves them as literals
  // rather than evaluating any template syntax inside an application or report name.
  const constLines = [
    `  service_name: ${quoted(serviceName)}`,
    ...(environment ? [`  environment: ${quoted(environment)}`] : []),
    `  email_subject: ${quoted(name)}`,
  ];

  const lines = [
    'version: "1"',
    `name: ${quoted(name)}`,
    `description: ${quoted(`Emails the Digital Experience scorecard of ${scope}`)}`,
    'enabled: false',
    'tags:',
    '  - digital-experience',
    'consts:',
    ...constLines,
    'triggers:',
    '  - type: scheduled',
    '    with:',
    '      rrule:',
    ...rruleLines,
    '  - type: manual',
    'steps:',
    '  - name: scorecard',
    '    type: digital-experience.getScorecardReport',
    '    with:',
    '      serviceName: "{{ consts.service_name }}"',
    ...(environment ? ['      environment: "{{ consts.environment }}"'] : []),
    `      lookbackDays: ${lookbackDays}`,
    '  - name: send_email',
    '    type: email',
    `    connector-id: ${quoted(connectorId)}`,
    '    with:',
    '      to:',
    ...recipients.map((recipient) => `        - ${quoted(recipient)}`),
    '      subject: "{{ consts.email_subject }}"',
    '      message: "{{ steps.scorecard.output.summary }}"',
  ];

  return `${lines.join('\n')}\n`;
};

// `restorable` preserves enablement (and its Task Manager schedule) across managed upgrades.
export const DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW = {
  id: DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW_ID,
  pluginId: 'digitalExperience',
  version: 1,
  billable: false,
  yamlTemplate: renderScorecardReportYaml,
  management: {
    lifecycle: 'dynamic',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition<DigitalExperienceScorecardReportTemplateValues>;
