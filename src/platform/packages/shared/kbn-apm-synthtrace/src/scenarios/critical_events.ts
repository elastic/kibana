/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LogDocument, Serializable } from '@kbn/apm-synthtrace-client';
import { SampleParserClient } from '@kbn/sample-log-parser';
import { StreamLogGenerator } from '@kbn/sample-log-parser/client/types';
import {
  LoghubQuery,
  createQueryMatcher,
  tokenize,
} from '@kbn/sample-log-parser/src/validate_queries';
import { range, memoize, chunk } from 'lodash';
import pLimit from 'p-limit';
import { v4 } from 'uuid';
import { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';

const scenario: Scenario<LogDocument> = async ({ from, to, ...runOptions }) => {
  const client = new SampleParserClient({ logger: runOptions.logger });

  const {
    rpm,
    limit = 10,
    rules = 10,
    interval = 1,
    maxSignals = limit,
    profileOnly = false,
  } = (runOptions.scenarioOpts ?? {}) as {
    limit?: number;
    maxSignals?: number;
    rpm?: number;
    rules?: number;
    interval?: number;
    profileOnly?: boolean;
  };

  runOptions.logger.info({
    rpm,
    limit,
    rules,
    interval,
    maxSignals,
  });

  const generators = await client.getLogGenerators({
    rpm,
  });

  const log = runOptions.logger;

  const getQueryMatcher = memoize(
    (query: LoghubQuery) => {
      return createQueryMatcher(query.query);
    },
    (query) => query.id
  );

  const getMatchingQueryIds = ({
    message,
    generator: { queries },
  }: {
    message: string;
    generator: StreamLogGenerator;
  }) => {
    const input = { tokens: tokenize(message), raw: message };
    const matchingIds: string[] = [];
    for (const query of queries) {
      const matches = getQueryMatcher(query)(input);
      if (matches) {
        matchingIds.push(query.id);
      }
    }

    return matchingIds;
  };

  return {
    bootstrap: async ({ streamsClient, kibanaClient, esClient }) => {
      await streamsClient.disable();

      await esClient.indices.delete(
        {
          index: 'logs',
        },
        { ignore: [404] }
      );

      await esClient.indices.deleteDataStream(
        {
          name: 'logs*',
        },
        {
          ignore: [404],
        }
      );

      const ruleIds = await kibanaClient
        .fetch<{ data: Array<{ id: string }> }>(
          `/api/detection_engine/rules/_find?per_page=1000`,
          {}
        )
        .then((response) => {
          return response.data.map((item) => item.id);
        });

      if (ruleIds.length) {
        log.info(`Deleting ${ruleIds.length} rules`);
        await Promise.all(
          chunk(ruleIds, 100).map((ids) =>
            kibanaClient.fetch('/api/detection_engine/rules/_bulk_action', {
              method: 'POST',
              body: { action: 'delete', ids },
            })
          )
        );
      }

      log.info('Enabling streams');
      await streamsClient.enable();

      if (!profileOnly) {
        log.debug('Forking streams');

        for (const generator of generators) {
          const streamName = `logs.${generator.name.toLowerCase()}`;

          log.debug(`Forking ${streamName}`);

          await streamsClient.forkStream('logs', {
            stream: {
              name: streamName,
            },
            if: {
              field: 'filepath',
              operator: 'eq',
              value: generator.filepath,
            },
          });
        }

        log.info(`Completed bootstrapping of streams with critical events`);
      }

      const streams = [
        'logs.android',
        'logs.apache',
        'logs.hadoop',
        'logs.hdfs',
        'logs.healthapp',
        'logs.hpc',
      ];

      const queries = streams.map((stream) => {
        return `FROM logs,logs.* METADATA _id, _version, _index
          | WHERE message LIKE "*"
          | SORT @timestamp DESC
          | LIMIT ${limit}
          `;
      });

      const limiter = pLimit(5);

      log.info(`Installing ${rules} rules`);

      await Promise.all(
        range(0, rules).map(async (index) => {
          const query = queries[index % queries.length];

          await limiter(() =>
            kibanaClient.fetch('/api/detection_engine/rules', {
              method: 'POST',
              body: {
                type: 'esql',
                language: 'esql',
                name: v4(),
                query,
                required_fields: [],
                author: [],
                false_positives: [],
                references: [],
                risk_score: 21,
                risk_score_mapping: [],
                severity: 'low',
                severity_mapping: [],
                threat: [],
                max_signals: maxSignals,
                description: 'test',
                tags: [],
                setup: '',
                license: '',
                interval: `${interval}m`,
                from: `now-${interval + 1}m`,
                to: 'now',
                actions: [],
                enabled: true,
                meta: {
                  kibana_siem_app_url: 'http://localhost:5601/app/security',
                },
              },
            })
          );
        })
      );
    },
    teardown: async ({ esClient }) => {},
    generate: ({ range: timeRange, clients: { streamsClient } }) => {
      if (profileOnly) {
        return [];
      }

      const start = timeRange.from.getTime();
      const end = timeRange.to.getTime();
      const ruleInterval = 3000 * 60 * 1;
      const maxAlerts = 100;

      const buckets = range(0, Math.ceil((end - start) / ruleInterval)).map((index) => {
        return {
          start: start + index * ruleInterval,
          end: start + ruleInterval + index * ruleInterval,
          count: {} as Record<string, number>,
        };
      });

      return withClient(
        streamsClient,
        timeRange.interval('5s').generator((timestamp) => {
          const bucketIndex = Math.floor((timestamp - start) / ruleInterval);

          const bucket = buckets[bucketIndex];

          return generators.flatMap((generator) =>
            generator
              .next(timestamp)
              .map((doc) => {
                const matchingIds: string[] = getMatchingQueryIds({
                  message: doc.message,
                  generator,
                });

                const generatedAlertIds: string[] = [];

                matchingIds.forEach((id) => {
                  const current = bucket.count[id] || 0;
                  if (current < maxAlerts) {
                    generatedAlertIds.push(id);
                  }
                  bucket.count[id] = current + 1;
                });

                doc['critical_event.rule_id'] = generatedAlertIds;
                doc['critical_event.query_id'] = matchingIds;

                Object.assign(doc, {
                  container: {
                    image: {
                      name: 'quay.io/jetstack/cert-manager-cainjector:v1.12.4',
                    },
                    runtime: 'containerd',
                    id: '5b1d864060fb9bdb6b97f9f3e8cb33acebd085465e9023f676ca98dd26963c86',
                  },
                  kubernetes: {
                    container: {
                      name: 'cert-manager-cainjector',
                    },
                    node: {
                      uid: 'be4a3d3c-bcc9-4506-bc4b-ce48ec598812',
                      hostname: 'ip-10-104-116-10.ec2.internal',
                      name: 'ip-10-104-116-10.ec2.internal',
                      labels: {
                        'infra_k8s_elastic_co/zone': 'us-east-1a',
                        'infra_k8s_elastic_co/csp': 'aws',
                        'crossplane_io/claim-namespace': 'production-aws-us-east-1',
                        'kubernetes_io/hostname': 'ip-10-104-116-10.ec2.internal',
                        'infra_k8s_elastic_co/k8s-cluster': 'prd-awsuse1-cp-app-6',
                        'topology_kubernetes_io/region': 'us-east-1',
                        'kubernetes_io/arch': 'arm64',
                        'topology_ebs_csi_aws_com/zone': 'us-east-1a',
                        'beta_kubernetes_io/instance-type': 'm6g.2xlarge',
                        'eks_amazonaws_com/nodegroup-image': 'ami-01af8560b504eb3db',
                        'failure-domain_beta_kubernetes_io/zone': 'us-east-1a',
                        'beta_kubernetes_io/os': 'linux',
                        'control-plane_k8s_elastic_co/platform': 'true',
                        'beta_kubernetes_io/arch': 'arm64',
                        'crossplane_io/composite': 'cp-app-6-5m98v',
                        'topology_kubernetes_io/zone': 'us-east-1a',
                        'crossplane_io/claim-name': 'prd-awsuse1-cp-app-6',
                        'infra_k8s_elastic_co/schedulable-for-hardware-profile': 'true',
                        'infra_k8s_elastic_co/nodepool': 'management001',
                        'control-plane_k8s_elastic_co/application-cluster': 'true',
                        'failure-domain_beta_kubernetes_io/region': 'us-east-1',
                        'elastic_co/owner': 'sre',
                        'k8s_io/cloud-provider-aws': 'a8941ef45331775c636357cb153eb9ca',
                        'infra_k8s_elastic_co/environment': 'production',
                        'eks_amazonaws_com/capacityType': 'ON_DEMAND',
                        'infra_k8s_elastic_co/hardware-profile': 'management',
                        'eks_amazonaws_com/nodegroup': 'prd-awsuse1-cp-app-6-management001-a',
                        'node_kubernetes_io/instance-type': 'm6g.2xlarge',
                        'kubernetes_io/os': 'linux',
                        'infra_k8s_elastic_co/role': 'workload',
                      },
                    },
                    pod: {
                      uid: 'ad7ce270-b072-4818-8a7f-f20604e1ba9c',
                      ip: '100.64.77.3',
                      name: 'cert-manager-cainjector-6d75545f7c-sg98l',
                    },
                    namespace: 'cert-manager',
                    replicaset: {
                      name: 'cert-manager-cainjector-6d75545f7c',
                    },
                    namespace_uid: 'cd35062b-4241-416f-aa8c-72ca88f57971',
                    namespace_labels: {
                      'kubernetes_io/metadata_name': 'cert-manager',
                    },
                    deployment: {
                      name: 'cert-manager-cainjector',
                    },
                    labels: {
                      app: 'cainjector',
                      'app_kubernetes_io/managed-by': 'Helm',
                      'helm_sh/chart': 'cert-manager-v1.12.4',
                      'pod-template-hash': '6d75545f7c',
                      'app_kubernetes_io/version': 'v1.12.4',
                      'app_kubernetes_io/name': 'cainjector',
                      'app_kubernetes_io/component': 'cainjector',
                      'app_kubernetes_io/instance': 'cert-manager',
                    },
                  },
                  agent: {
                    name: 'ip-10-104-116-10.ec2.internal',
                    id: 'fe7ce3d2-f1b6-40fa-b7ac-60cc6720763f',
                    ephemeral_id: '22e987e5-ade3-482e-a946-e89789b86d8e',
                    type: 'filebeat',
                    version: '8.13.3',
                  },
                  log: {
                    file: {
                      inode: '34656751',
                      path: '/var/log/containers/cert-manager-cainjector-6d75545f7c-sg98l_cert-manager_cert-manager-cainjector-5b1d864060fb9bdb6b97f9f3e8cb33acebd085465e9023f676ca98dd26963c86.log',
                      device_id: '66305',
                    },
                    offset: 481664,
                  },
                  kind: 'mutatingwebhookconfiguration',
                  elastic_agent: {
                    id: 'fe7ce3d2-f1b6-40fa-b7ac-60cc6720763f',
                    version: '8.13.3',
                    snapshot: false,
                  },
                  cloud: {
                    availability_zone: 'us-east-1a',
                    image: {
                      id: 'ami-01af8560b504eb3db',
                    },
                    instance: {
                      id: 'i-062d4333c1088589a',
                    },
                    provider: 'aws',
                    machine: {
                      type: 'm6g.2xlarge',
                    },
                    service: {
                      name: 'EC2',
                    },
                    region: 'us-east-1',
                    account: {
                      id: '801103362465',
                    },
                  },
                  input: {
                    type: 'filestream',
                  },
                  orchestrator: {
                    cluster: {
                      role: 'workload',
                      name: 'prd-awsuse1-cp-app-6',
                    },
                    source: {
                      agent: 'elastic-agent',
                    },
                    platform: {
                      type: 'mki',
                    },
                  },
                  caller: 'cainjector/reconciler.go:142',
                  ecs: {
                    version: '8.0.0',
                  },
                  stream: 'stderr',
                  v: 2,
                  service: {
                    name: 'cainjector',
                    version: 'v1.12.4',
                  },
                  host: {
                    hostname: 'ip-10-104-116-10.ec2.internal',
                    os: {
                      kernel: '5.10.213-201.855.amzn2.aarch64',
                      codename: 'focal',
                      name: 'Ubuntu',
                      type: 'linux',
                      family: 'debian',
                      version: '20.04.6 LTS (Focal Fossa)',
                      platform: 'ubuntu',
                    },
                    containerized: true,
                    ip: [
                      '10.104.116.10',
                      'fe80::c5a:2dff:febd:3d5',
                      '100.64.238.109',
                      'fe80::c2b:deff:fecc:ced1',
                      'fe80::88bb:eff:fef6:8653',
                      '100.64.243.244',
                      'fe80::70b5:30ff:fe62:7b0b',
                      'fe80::d026:95ff:feaf:3f07',
                      'fe80::d016:5bff:fe6a:ef8c',
                      'fe80::b8b4:dcff:fe81:c194',
                      'fe80::8cfc:19ff:fee4:272d',
                      'fe80::8080:d0ff:fe05:59b7',
                      'fe80::e4f5:b5ff:fe2c:77fa',
                      'fe80::7488:57ff:fe57:eb0b',
                      'fe80::486c:f3ff:fecb:6367',
                      'fe80::5cea:8fff:fe48:b2a6',
                      'fe80::c801:49ff:fea7:90fe',
                      'fe80::c842:2cff:fe43:e0b6',
                      'fe80::180f:3dff:fead:6a68',
                      'fe80::2479:58ff:feaa:9d84',
                      'fe80::c5a:a0ff:fecf:48d0',
                    ],
                    name: 'ip-10-104-116-10.ec2.internal',
                    mac: [
                      '0E-2B-DE-CC-CE-D1',
                      '0E-5A-2D-BD-03-D5',
                      '0E-5A-A0-CF-48-D0',
                      '1A-0F-3D-AD-6A-68',
                      '26-79-58-AA-9D-84',
                      '4A-6C-F3-CB-63-67',
                      '5E-EA-8F-48-B2-A6',
                      '72-B5-30-62-7B-0B',
                      '76-88-57-57-EB-0B',
                      '82-80-D0-05-59-B7',
                      '8A-BB-0E-F6-86-53',
                      '8E-FC-19-E4-27-2D',
                      'BA-B4-DC-81-C1-94',
                      'CA-01-49-A7-90-FE',
                      'CA-42-2C-43-E0-B6',
                      'D2-16-5B-6A-EF-8C',
                      'D2-26-95-AF-3F-07',
                      'E6-F5-B5-2C-77-FA',
                    ],
                    architecture: 'aarch64',
                  },
                  name: 'topolvm-provisioner-hook',
                  event: {
                    agent_id_status: 'auth_metadata_missing',
                    ingested: '2024-06-10T14:18:05Z',
                    dataset: 'cainjector.log',
                  },
                  ts: 1718029077840.9922,
                });
                return doc;
              })
              .map((doc) => new Serializable(doc))
          );
        })
      );
    },
  };
};

export default scenario;
