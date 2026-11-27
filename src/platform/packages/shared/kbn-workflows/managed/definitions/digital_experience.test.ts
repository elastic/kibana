/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import {
  DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW,
  type DigitalExperienceScorecardReportTemplateValues,
} from './digital_experience';

const baseValues: DigitalExperienceScorecardReportTemplateValues = {
  name: 'Weekly scorecard: checkout-web',
  serviceName: 'checkout-web',
  lookbackDays: 7,
  frequency: 'WEEKLY',
  weekday: 'MO',
  hour: 9,
  minute: 0,
  timeZone: 'UTC',
  connectorId: 'email-connector-1',
  recipients: ['team@example.com'],
};

describe('DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW', () => {
  it('renders a weekly schedule with scorecard and email steps', () => {
    const parsed = parse(DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW.yamlTemplate(baseValues));

    expect(parsed).toMatchObject({
      version: '1',
      name: 'Weekly scorecard: checkout-web',
      enabled: false,
      consts: {
        service_name: 'checkout-web',
        email_subject: 'Weekly scorecard: checkout-web',
      },
      triggers: [
        {
          type: 'scheduled',
          with: {
            rrule: {
              freq: 'WEEKLY',
              interval: 1,
              tzid: 'UTC',
              byweekday: ['MO'],
              byhour: [9],
              byminute: [0],
            },
          },
        },
        { type: 'manual' },
      ],
      steps: [
        {
          name: 'scorecard',
          type: 'digital-experience.getScorecardReport',
          with: {
            serviceName: '{{ consts.service_name }}',
            lookbackDays: 7,
          },
        },
        {
          name: 'send_email',
          type: 'email',
          'connector-id': 'email-connector-1',
          with: {
            to: ['team@example.com'],
            subject: '{{ consts.email_subject }}',
            message: '{{ steps.scorecard.output.summary }}',
          },
        },
      ],
    });
    expect(parsed.consts.environment).toBeUndefined();
    expect(parsed.steps[0].with.environment).toBeUndefined();
  });

  it('includes environment in consts and step input when specified', () => {
    const parsed = parse(
      DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW.yamlTemplate({
        ...baseValues,
        environment: 'production',
      })
    );

    expect(parsed.consts.environment).toBe('production');
    expect(parsed.steps[0].with.environment).toBe('{{ consts.environment }}');
  });

  it('renders daily and monthly schedules with matching rrule fields', () => {
    const daily = parse(
      DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW.yamlTemplate({
        ...baseValues,
        frequency: 'DAILY',
        hour: 8,
        minute: 30,
        timeZone: 'America/New_York',
      })
    );
    expect(daily.triggers[0].with.rrule).toEqual({
      freq: 'DAILY',
      interval: 1,
      tzid: 'America/New_York',
      byhour: [8],
      byminute: [30],
    });

    const monthly = parse(
      DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW.yamlTemplate({
        ...baseValues,
        frequency: 'MONTHLY',
        monthday: 15,
        hour: 14,
        minute: 15,
      })
    );
    expect(monthly.triggers[0].with.rrule).toEqual({
      freq: 'MONTHLY',
      interval: 1,
      tzid: 'UTC',
      bymonthday: [15],
      byhour: [14],
      byminute: [15],
    });
  });

  it('keeps YAML special characters and Liquid syntax literal via consts', () => {
    const parsed = parse(
      DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW.yamlTemplate({
        ...baseValues,
        name: 'Report: {{ env }} "prod"',
        serviceName: 'app: "{{ evil }}"',
        environment: 'env: {% if true %}',
      })
    );

    expect(parsed.name).toBe('Report: {{ env }} "prod"');
    expect(parsed.consts).toEqual({
      service_name: 'app: "{{ evil }}"',
      environment: 'env: {% if true %}',
      email_subject: 'Report: {{ env }} "prod"',
    });
  });
});
