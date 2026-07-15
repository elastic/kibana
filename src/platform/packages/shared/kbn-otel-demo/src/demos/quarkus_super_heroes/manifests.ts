/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import yaml from 'js-yaml';
import type { DemoManifestGenerator, ManifestOptions } from '../../types';

/**
 * Creates common Kubernetes resources needed by all demos
 */
function createCommonManifests(options: ManifestOptions): object[] {
  const manifests: object[] = [];
  const namespace = options.config.namespace;

  // Namespace
  manifests.push({
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: {
      name: namespace,
      labels: {
        'app.kubernetes.io/name': options.config.id,
      },
    },
  });

  // OTel Collector ConfigMap
  manifests.push({
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: 'otel-collector-config',
      namespace,
    },
    data: {
      'otel-collector-config.yaml': options.collectorConfigYaml,
    },
  });

  // OTel Collector ServiceAccount (needed for k8sattributes)
  manifests.push({
    apiVersion: 'v1',
    kind: 'ServiceAccount',
    metadata: {
      name: 'otel-collector',
      namespace,
    },
  });

  // ClusterRole for k8sattributes, k8s_cluster, kubeletstats, and k8s_events receivers
  manifests.push({
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'ClusterRole',
    metadata: {
      name: `otel-collector-${namespace}`,
    },
    rules: [
      {
        apiGroups: [''],
        resources: [
          'pods',
          'namespaces',
          'nodes',
          'nodes/stats',
          'nodes/proxy',
          'services',
          'events',
          'replicationcontrollers',
          'resourcequotas',
        ],
        verbs: ['get', 'watch', 'list'],
      },
      {
        apiGroups: ['apps'],
        resources: ['replicasets', 'deployments', 'daemonsets', 'statefulsets'],
        verbs: ['get', 'watch', 'list'],
      },
      {
        apiGroups: ['batch'],
        resources: ['jobs', 'cronjobs'],
        verbs: ['get', 'watch', 'list'],
      },
      {
        apiGroups: ['autoscaling'],
        resources: ['horizontalpodautoscalers'],
        verbs: ['get', 'watch', 'list'],
      },
      {
        apiGroups: ['events.k8s.io'],
        resources: ['events'],
        verbs: ['get', 'watch', 'list'],
      },
    ],
  });

  // ClusterRoleBinding
  manifests.push({
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'ClusterRoleBinding',
    metadata: {
      name: `otel-collector-${namespace}`,
    },
    subjects: [
      {
        kind: 'ServiceAccount',
        name: 'otel-collector',
        namespace,
      },
    ],
    roleRef: {
      kind: 'ClusterRole',
      name: `otel-collector-${namespace}`,
      apiGroup: 'rbac.authorization.k8s.io',
    },
  });

  // OTel Collector Deployment
  manifests.push({
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: 'otel-collector',
      namespace,
      labels: {
        app: 'otel-collector',
      },
    },
    spec: {
      replicas: 1,
      selector: {
        matchLabels: {
          app: 'otel-collector',
        },
      },
      template: {
        metadata: {
          labels: {
            app: 'otel-collector',
          },
        },
        spec: {
          serviceAccountName: 'otel-collector',
          ...(options.hostAliases ? { hostAliases: options.hostAliases } : {}),
          containers: [
            {
              name: 'otel-collector',
              image: options.collectorImage || 'otel/opentelemetry-collector-contrib:0.115.1',
              args: ['--config=/etc/otel-collector-config.yaml'],
              ports: [
                { containerPort: 4317, name: 'otlp-grpc' },
                { containerPort: 4318, name: 'otlp-http' },
                { containerPort: 13133, name: 'health' },
              ],
              securityContext: {
                runAsUser: 0,
                runAsGroup: 0,
                privileged: true,
                readOnlyRootFilesystem: false,
              },
              env: [
                {
                  name: 'K8S_NODE_NAME',
                  valueFrom: { fieldRef: { fieldPath: 'spec.nodeName' } },
                },
                {
                  name: 'OTEL_K8S_NODE_NAME',
                  valueFrom: { fieldRef: { fieldPath: 'spec.nodeName' } },
                },
                {
                  name: 'K8S_POD_NAME',
                  valueFrom: { fieldRef: { fieldPath: 'metadata.name' } },
                },
                {
                  name: 'K8S_POD_NAMESPACE',
                  valueFrom: { fieldRef: { fieldPath: 'metadata.namespace' } },
                },
                {
                  name: 'K8S_POD_IP',
                  valueFrom: { fieldRef: { fieldPath: 'status.podIP' } },
                },
              ],
              volumeMounts: [
                {
                  name: 'config',
                  mountPath: '/etc/otel-collector-config.yaml',
                  subPath: 'otel-collector-config.yaml',
                },
                { name: 'varlogpods', mountPath: '/var/log/pods', readOnly: true },
                { name: 'varlogcontainers', mountPath: '/var/log/containers', readOnly: true },
                {
                  name: 'varlibdockercontainers',
                  mountPath: '/var/lib/docker/containers',
                  readOnly: true,
                },
                {
                  name: 'hostfs',
                  mountPath: '/hostfs',
                  readOnly: true,
                  mountPropagation: 'HostToContainer',
                },
              ],
              livenessProbe: {
                httpGet: { path: '/', port: 13133 },
                initialDelaySeconds: 10,
              },
              readinessProbe: {
                httpGet: { path: '/', port: 13133 },
                initialDelaySeconds: 5,
              },
            },
          ],
          volumes: [
            {
              name: 'config',
              configMap: {
                name: 'otel-collector-config',
              },
            },
            {
              name: 'varlogpods',
              hostPath: {
                path: '/var/log/pods',
              },
            },
            {
              name: 'varlogcontainers',
              hostPath: {
                path: '/var/log/containers',
              },
            },
            {
              name: 'varlibdockercontainers',
              hostPath: {
                path: '/var/lib/docker/containers',
              },
            },
            {
              name: 'hostfs',
              hostPath: {
                path: '/',
              },
            },
          ],
        },
      },
    },
  });

  // OTel Collector Service
  manifests.push({
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name: 'otel-collector',
      namespace,
    },
    spec: {
      selector: {
        app: 'otel-collector',
      },
      ports: [
        { port: 4317, targetPort: 4317, name: 'otlp-grpc' },
        { port: 4318, targetPort: 4318, name: 'otlp-http' },
      ],
    },
  });

  return manifests;
}

/**
 * Creates a Kubernetes Deployment
 */
function createDeployment(opts: {
  name: string;
  namespace: string;
  demoId: string;
  image: string;
  ports?: number[];
  env?: Record<string, string>;
  command?: string[];
  args?: string[];
  resources?: {
    limits?: { memory?: string; cpu?: string };
    requests?: { memory?: string; cpu?: string };
  };
  initContainers?: Array<{
    name: string;
    image: string;
    command?: string[];
    args?: string[];
    volumeMounts?: Array<{ name: string; mountPath: string }>;
  }>;
  volumes?: Array<{
    name: string;
    emptyDir?: Record<string, never>;
    configMap?: { name: string };
  }>;
  volumeMounts?: Array<{ name: string; mountPath: string }>;
}): object {
  const envList = opts.env
    ? Object.entries(opts.env).map(([name, value]) => ({ name, value }))
    : [];

  const container: Record<string, unknown> = {
    name: opts.name,
    image: opts.image,
  };

  if (opts.ports && opts.ports.length > 0) {
    container.ports = opts.ports.map((p) => ({ containerPort: p }));
  }

  if (envList.length > 0) {
    container.env = envList;
  }

  if (opts.command) {
    container.command = opts.command;
  }

  if (opts.args) {
    container.args = opts.args;
  }

  if (opts.resources) {
    container.resources = opts.resources;
  }

  if (opts.volumeMounts) {
    container.volumeMounts = opts.volumeMounts;
  }

  const podSpec: Record<string, unknown> = {
    containers: [container],
  };

  if (opts.initContainers && opts.initContainers.length > 0) {
    podSpec.initContainers = opts.initContainers;
  }

  if (opts.volumes && opts.volumes.length > 0) {
    podSpec.volumes = opts.volumes;
  }

  return {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: opts.name,
      namespace: opts.namespace,
      labels: {
        app: opts.name,
        'app.kubernetes.io/name': opts.name,
        'app.kubernetes.io/part-of': opts.demoId,
      },
    },
    spec: {
      replicas: 1,
      selector: {
        matchLabels: {
          app: opts.name,
        },
      },
      template: {
        metadata: {
          labels: {
            app: opts.name,
            'app.kubernetes.io/name': opts.name,
            'app.kubernetes.io/part-of': opts.demoId,
          },
        },
        spec: podSpec,
      },
    },
  };
}

/**
 * Creates a Kubernetes Service
 */
function createService(name: string, namespace: string, ports: number[]): object {
  return {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name,
      namespace,
    },
    spec: {
      selector: {
        app: name,
      },
      ports: ports.map((p) => ({ port: p, targetPort: p })),
    },
  };
}

/**
 * Creates Kafka deployment with special initialization for KRaft mode
 */
function createKafkaDeployment(namespace: string, demoId: string): object {
  return {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: 'fights-kafka',
      namespace,
      labels: {
        app: 'fights-kafka',
        'app.kubernetes.io/name': 'fights-kafka',
        'app.kubernetes.io/part-of': demoId,
      },
    },
    spec: {
      replicas: 1,
      selector: {
        matchLabels: {
          app: 'fights-kafka',
        },
      },
      template: {
        metadata: {
          labels: {
            app: 'fights-kafka',
            'app.kubernetes.io/name': 'fights-kafka',
            'app.kubernetes.io/part-of': demoId,
          },
        },
        spec: {
          containers: [
            {
              name: 'fights-kafka',
              image: 'quay.io/strimzi/kafka:0.43.0-kafka-3.8.0',
              command: [
                'sh',
                '-c',
                'export CLUSTER_ID=$(bin/kafka-storage.sh random-uuid) && bin/kafka-storage.sh format -t ${CLUSTER_ID} -c config/kraft/server.properties && bin/kafka-server-start.sh config/kraft/server.properties --override advertised.listeners=${KAFKA_ADVERTISED_LISTENERS}',
              ],
              ports: [{ containerPort: 9092 }],
              env: [
                { name: 'LOG_DIR', value: '/tmp/logs' },
                { name: 'KAFKA_ADVERTISED_LISTENERS', value: 'PLAINTEXT://fights-kafka:9092' },
              ],
              resources: {
                limits: { memory: '1Gi', cpu: '1' },
                requests: { memory: '512Mi', cpu: '0.5' },
              },
            },
          ],
        },
      },
    },
  };
}

/**
 * Manifest generator for Quarkus Super Heroes
 */
export const quarkusSuperHeroesManifests: DemoManifestGenerator = {
  generate(options: ManifestOptions): string {
    const manifests: object[] = [];
    const namespace = options.config.namespace;
    const demoId = options.config.id;
    const envOverrides = options.envOverrides || {};

    // Add common manifests (namespace, collector, etc.)
    manifests.push(...createCommonManifests(options));

    // Get all services for this demo
    const services = options.config.getServices(options.version);

    // Deploy each service
    for (const svc of services) {
      let finalEnv = { ...svc.env };

      // Apply scenario overrides (take precedence)
      const serviceEnvOverrides = envOverrides[svc.name] || {};
      finalEnv = { ...finalEnv, ...serviceEnvOverrides };

      // Handle Kafka specially - needs custom command for KRaft initialization
      if (svc.name === 'fights-kafka') {
        manifests.push(createKafkaDeployment(namespace, demoId));
      } else {
        // Standard deployment with resource limits for Quarkus services
        const resources =
          svc.resources ??
          (svc.name.startsWith('rest-') ||
          svc.name.startsWith('grpc-') ||
          svc.name === 'event-statistics' ||
          svc.name === 'ui-super-heroes'
            ? {
                limits: { memory: '1Gi', cpu: '1' },
                requests: { memory: '256Mi', cpu: '0.5' },
              }
            : undefined);

        manifests.push(
          createDeployment({
            name: svc.name,
            namespace,
            demoId,
            image: svc.image,
            ports: svc.port ? [svc.port] : [],
            env: finalEnv,
            command: svc.command,
            args: svc.args,
            resources,
            initContainers: svc.initContainers,
            volumes: svc.volumes,
            volumeMounts: svc.volumeMounts,
          })
        );
      }

      if (svc.port) {
        manifests.push(createService(svc.name, namespace, [svc.port]));
      }
    }

    // Frontend NodePort for external access (UI Super Heroes)
    if (options.config.frontendService) {
      manifests.push({
        apiVersion: 'v1',
        kind: 'Service',
        metadata: {
          name: `${options.config.frontendService.name}-external`,
          namespace,
        },
        spec: {
          type: 'NodePort',
          selector: {
            app: options.config.frontendService.name,
          },
          ports: [
            {
              port: 8080,
              targetPort: 8080,
              nodePort: options.config.frontendService.nodePort,
            },
          ],
        },
      });
    }

    // Additional NodePort for rest-fights API (for external API testing)
    manifests.push({
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: 'rest-fights-external',
        namespace,
      },
      spec: {
        type: 'NodePort',
        selector: {
          app: 'rest-fights',
        },
        ports: [
          {
            port: 8082,
            targetPort: 8082,
            nodePort: 30083,
          },
        ],
      },
    });

    // Event statistics external access
    manifests.push({
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: 'event-statistics-external',
        namespace,
      },
      spec: {
        type: 'NodePort',
        selector: {
          app: 'event-statistics',
        },
        ports: [
          {
            port: 8085,
            targetPort: 8085,
            nodePort: 30084,
          },
        ],
      },
    });

    return manifests.map((m) => yaml.dump(m)).join('---\n');
  },
};
