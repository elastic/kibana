/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const mockedKibanaBrowserPayload = {
  transactions: [
    {
      id: 'c48b65fe2f21ccfc',
      trace_id: '4520717268bdeabfe47b2faf3515f907',
      name: 'Click - div',
      type: 'user-interaction',
      duration: 32,
      spans: [
        {
          id: '32983da6ddaf9d2c',
          transaction_id: 'c48b65fe2f21ccfc',
          parent_id: 'c48b65fe2f21ccfc',
          trace_id: '4520717268bdeabfe47b2faf3515f907',
          name: 'POST http://localhost:5601//v3/send/kibana-browser',
          type: 'external',
          subtype: 'http',
          start: 1,
          duration: 31,
          context: {
            http: {
              method: 'POST',
              url: 'http://localhost:5601//v3/send/kibana-browser',
              status_code: 200,
            },
            destination: {
              service: {
                resource: 'localhost:5601',
                name: 'N/A',
                type: 'N/A',
              },
              address: 'localhost',
              port: 5601,
            },
          },
          outcome: 'success',
          sample_rate: 1,
        },
      ],
      context: {
        custom: {
          classes:
            'euiFlexGroup euiPageHeaderContent__top css-zk9s4c-euiFlexGroup-responsive-wrap-l-flexStart-stretch-row-euiPageHeaderContent__top',
        },
        page: {
          referer: '',
          url: 'http://localhost:5601/kibana/app/observability/alerts',
        },
      },
      marks: {
        agent: {},
      },
      span_count: {
        started: 1,
      },
      sampled: true,
      sample_rate: 1,
    },
  ],
  errors: [],
};

export const mockedRandomTransactionPayload = {
  transactions: [
    {
      id: 'e143873960387c24',
      trace_id: '2fbc9d0d6959e8fb7745374c04af34e1',
      name: 'observability-overview /alerts',
      type: 'route-change',
      duration: 1669,
      context: {
        page: {
          referer: '',
          url: 'http://localhost:5601/kibana/app/observability/alerts?_a=(filters:!(),groupings:!(none),kuery:%27%27,rangeFrom:now-24h,rangeTo:now)',
        },
      },
      marks: {
        agent: {},
      },
      spans: [
        {
          id: 'e6f2baf4abc007cf',
          transaction_id: 'e143873960387c24',
          parent_id: 'e143873960387c24',
          trace_id: '2fbc9d0d6959e8fb7745374c04af34e1',
          name: '4x POST http://localhost:5601/kibana/internal/controls/optionsList/.alerts-observability.apm.alerts-default,.alerts-observability.uptime.alerts-default,.alerts-observability.metrics.alerts-default,.alerts-default.alerts-default,.alerts-observability.logs.alerts-default,.alerts-observability.slo.alerts-default,.alerts-observability.threshold.alerts-default,.alerts-stack.alerts-default,.alerts-ml.anomaly-detection.alerts-default,.alerts-dataset.quality.alerts-default',
          type: 'external',
          subtype: 'http',
          start: 99,
          duration: 124,
          context: {
            http: {
              method: 'POST',
              url: 'http://localhost:5601/kibana/internal/controls/optionsList/.alerts-observability.apm.alerts-default,.alerts-observability.uptime.alerts-default,.alerts-observability.metrics.alerts-default,.alerts-default.alerts-default,.alerts-observability.logs.alerts-default,.alerts-observability.slo.alerts-default,.alerts-observability.threshold.alerts-default,.alerts-stack.alerts-default,.alerts-ml.anomaly-detection.alerts-default,.alerts-dataset.quality.alerts-default',
            },
            destination: {
              service: {
                resource: 'localhost:5601',
                name: 'N/A',
                type: 'N/A',
              },
              address: 'localhost',
              port: 5601,
            },
          },
          outcome: 'unknown',
          sample_rate: 1,
        },
        {
          id: '22c3307ce342c670',
          transaction_id: 'e143873960387c24',
          parent_id: 'e143873960387c24',
          trace_id: '2fbc9d0d6959e8fb7745374c04af34e1',
          name: 'POST http://localhost:5601/kibana/internal/rac/alerts/_alert_summary',
          type: 'external',
          subtype: 'http',
          start: 228,
          duration: 1429,
          context: {
            http: {
              method: 'POST',
              url: 'http://localhost:5601/kibana/internal/rac/alerts/_alert_summary',
              status_code: 200,
            },
            destination: {
              service: {
                resource: 'localhost:5601',
                name: 'N/A',
                type: 'N/A',
              },
              address: 'localhost',
              port: 5601,
            },
          },
          outcome: 'success',
          sample_rate: 1,
        },
      ],
      span_count: {
        started: 2,
      },
      sampled: true,
      sample_rate: 1,
    },
  ],
  errors: [],
};
