/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { DATADOG_ALERT_TRANSLATION_WORKFLOW } from '.';
import DATADOG_ALERT_TRANSLATION_YAML from './datadog_alert_translation.yaml';
import { ALL_CONNECTOR_IDS } from '../../../common/constants';

describe('Datadog alert translation managed workflow', () => {
  const workflow = parse(DATADOG_ALERT_TRANSLATION_YAML);

  it('is not billable', () => {
    expect(DATADOG_ALERT_TRANSLATION_WORKFLOW.billable).toBe(false);
  });

  it('subscribes to every Datadog connector instance', () => {
    expect(workflow).toEqual(
      expect.objectContaining({
        triggers: [
          {
            type: 'datadog.alert',
            'connector-id': ALL_CONNECTOR_IDS,
          },
        ],
      })
    );
  });

  it('maps Datadog lifecycle events into alert events and continues on invalid payloads', () => {
    expect(workflow).toEqual(
      expect.objectContaining({
        steps: [
          expect.objectContaining({
            name: 'create_datadog_alert',
            type: 'alerting.create_alert',
            with: expect.objectContaining({
              source: 'datadog',
              fingerprint: `{{ event.body.monitor_id }}:{{ event.body.scopes | default: "${ALL_CONNECTOR_IDS}" }}`,
              alert_status:
                '{% if event.body.alert_transition == "Recovered" %}inactive{% else %}active{% endif %}',
              data: expect.objectContaining({
                rule_name: '{{ event.body.title }}',
                monitor_id: '{{ event.body.monitor_id }}',
                alert_url: '{{ event.body.url }}',
                message: '{{ event.body.body }}',
                priority: '{{ event.body.severity }}',
              }),
            }),
            'on-failure': { continue: true },
          }),
        ],
      })
    );
  });
});
