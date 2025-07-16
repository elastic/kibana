/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const mockedEbtLocalShipperPayload = {
  transactions: [
    {
      id: 'abd1cc2716f35cd4',
      trace_id: 'e0a417ddd0297dcc7f3376b307467fee',
      name: 'POST /internal/telemetry/ebt_local_shipper',
      type: 'http-request',
      duration: 30,
      context: {
        page: {
          referer: '',
          url: 'http://localhost:5601/kibana/app/observability/alerts?_a=(controlConfigs:!((exclude:!f,existsSelected:!f,fieldName:kibana.alert.status,hideActionBar:!t,selectedOptions:!(),title:Status),(exclude:!f,existsSelected:!f,fieldName:kibana.alert.rule.name,hideActionBar:!f,selectedOptions:!(),title:Rule),(exclude:!f,existsSelected:!f,fieldName:kibana.alert.group.value,hideActionBar:!f,selectedOptions:!(),title:Group),(exclude:!f,existsSelected:!f,fieldName:tags,hideActionBar:!f,selectedOptions:!(),title:Tags)),filters:!(),groupings:!(none),kuery:%27%27,rangeFrom:now-24h,rangeTo:now)',
        },
      },
      marks: {
        agent: {},
      },
      spans: [
        {
          id: 'dbbd0b78e910f443',
          transaction_id: 'df7f0ecbba0ca943',
          parent_id: 'df7f0ecbba0ca943',
          trace_id: 'fa657d10bf4417ff28125399cc1cea40',
          name: 'POST http://localhost:5601/kibana/internal/telemetry/ebt_local_shipper',
          type: 'external',
          subtype: 'http',
          start: 0,
          duration: 51,
          context: {
            http: {
              method: 'POST',
              url: 'http://localhost:5601/kibana/internal/telemetry/ebt_local_shipper',
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
        started: 1,
      },
      sampled: true,
      sample_rate: 1,
      outcome: 'success',
    },
  ],
  errors: [],
};

export const mockedKibanaBrowserPayload = {
  transactions: [
    {
      id: '07802582a3c3947f',
      trace_id: '7a90cbb59e214f74d8d29a079df75f87',
      name: 'POST /v3/send/kibana-browser',
      type: 'http-request',
      duration: 479,
      context: {
        page: {
          referer: '',
          url: 'http://localhost:5601/kibana/app/observability/alerts?_a=(controlConfigs:!((exclude:!f,existsSelected:!f,fieldName:kibana.alert.status,hideActionBar:!t,selectedOptions:!(),title:Status),(exclude:!f,existsSelected:!f,fieldName:kibana.alert.rule.name,hideActionBar:!f,selectedOptions:!(),title:Rule),(exclude:!f,existsSelected:!f,fieldName:kibana.alert.group.value,hideActionBar:!f,selectedOptions:!(),title:Group),(exclude:!f,existsSelected:!f,fieldName:tags,hideActionBar:!f,selectedOptions:!(),title:Tags)),filters:!(),groupings:!(none),kuery:%27%27,rangeFrom:now-24h,rangeTo:now)',
        },
      },
      marks: {
        agent: {},
      },
      spans: [
        {
          id: '194e11ac7ff04d99',
          transaction_id: '823dc836c3dd7112',
          parent_id: '823dc836c3dd7112',
          trace_id: '116dc5a94d9a330aea6119ad30b2660c',
          name: 'POST https://telemetry-staging.elastic.co/v3/send/kibana-browser',
          type: 'external',
          subtype: 'http',
          start: 0,
          duration: 494,
          context: {
            http: {
              method: 'POST',
              url: 'https://telemetry-staging.elastic.co/v3/send/kibana-browser',
              status_code: 200,
            },
            destination: {
              service: {
                resource: 'telemetry-staging.elastic.co:443',
                name: 'N/A',
                type: 'N/A',
              },
              address: 'telemetry-staging.elastic.co',
              port: 443,
            },
          },
          outcome: 'success',
          sample_rate: 1,
        },
      ],
      span_count: {
        started: 1,
      },
      sampled: true,
      sample_rate: 1,
      outcome: 'success',
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
          url: 'http://localhost:5601/kibana/app/observability/alerts?_a=(controlConfigs:!((exclude:!f,existsSelected:!f,fieldName:kibana.alert.status,hideActionBar:!t,selectedOptions:!(),title:Status),(exclude:!f,existsSelected:!f,fieldName:kibana.alert.rule.name,hideActionBar:!f,selectedOptions:!(),title:Rule),(exclude:!f,existsSelected:!f,fieldName:kibana.alert.group.value,hideActionBar:!f,selectedOptions:!(),title:Group),(exclude:!f,existsSelected:!f,fieldName:tags,hideActionBar:!f,selectedOptions:!(),title:Tags)),filters:!(),groupings:!(none),kuery:%27%27,rangeFrom:now-24h,rangeTo:now)',
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
  errors: [
    {
      id: 'b4616551eafcae6daca722d46b6134f9',
      culprit: '(inline script)',
      exception: {
        message: 'ResizeObserver loop completed with undelivered notifications.',
        stacktrace: [],
      },
      context: {
        page: {
          referer: '',
          url: 'http://localhost:5601/kibana/app/observability/alerts?_a=(controlConfigs:!((exclude:!f,existsSelected:!f,fieldName:kibana.alert.status,hideActionBar:!t,selectedOptions:!(),title:Status),(exclude:!f,existsSelected:!f,fieldName:kibana.alert.rule.name,hideActionBar:!f,selectedOptions:!(),title:Rule),(exclude:!f,existsSelected:!f,fieldName:kibana.alert.group.value,hideActionBar:!f,selectedOptions:!(),title:Group),(exclude:!f,existsSelected:!f,fieldName:tags,hideActionBar:!f,selectedOptions:!(),title:Tags)),filters:!(),groupings:!(none),kuery:%27%27,rangeFrom:now-24h,rangeTo:now)',
        },
      },
      trace_id: '2fbc9d0d6959e8fb7745374c04af34e1',
      parent_id: 'e143873960387c24',
      transaction_id: 'e143873960387c24',
      transaction: {
        type: 'route-change',
        sampled: true,
      },
    },
  ],
};
