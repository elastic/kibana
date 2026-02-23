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
      name: 'otel-collector',
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
      name: 'otel-collector',
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
      name: 'otel-collector',
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
          containers: [
            {
              name: 'otel-collector',
              image: 'otel/opentelemetry-collector-contrib:0.115.1',
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
}): object {
  const envList = opts.env
    ? Object.entries(opts.env).map(([name, value]) => ({ name, value }))
    : [];

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
        spec: {
          containers: [
            {
              name: opts.name,
              image: opts.image,
              ...(opts.ports && { ports: opts.ports.map((p) => ({ containerPort: p })) }),
              ...(envList.length > 0 && { env: envList }),
            },
          ],
        },
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
 * Creates a ConfigMap for Bank of Anthos environment and service configurations
 */
function createConfigMaps(namespace: string): object[] {
  return [
    {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: 'environment-config',
        namespace,
      },
      data: {
        LOCAL_ROUTING_NUM: '883745000',
        PUB_KEY_PATH: '/tmp/.ssh/publickey',
      },
    },
    {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: 'demo-data-config',
        namespace,
      },
      data: {
        USE_DEMO_DATA: 'True',
        DEMO_LOGIN_USERNAME: 'testuser',
        DEMO_LOGIN_PASSWORD: 'bankofanthos',
      },
    },
  ];
}

/**
 * Creates a JWT key secret for Bank of Anthos authentication
 */
function createJwtSecret(namespace: string): object {
  const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAlkja/yfBxFKwBWyLzNPdqXaJKZfv8MsKPPbLMhOqTrELxnI2
5DBM/QL2eLDJHjKMzDvqVjBa9X8ZxyMEkq9DXOo1F3v5I8JPhAqMCMz3R5KLXU5d
XWmWXy7K/m9FwNqqp9E8j7aN6SaFFkSWSG3uVwVnwvhvyWgJx5UBJB9hIHmVsLFp
eYDM1cH8qOGR9bC8dHhsyLCgIqZaLKlBQr9hiqoqPfqHVvBdT9aKcmrqFnmVlCQL
0bfTPd7vfCSCCZ7qIpJhNgouQ6H8K/8lUI8eA8zk+5jZ9fvCi0nPPDU7p3BVxW7s
qqQxJHGLIAWL1FJTHX6E8T8aqNlV8k7K+jZCVwIDAQABAoIBAETlMwPmNZiMFmEN
wLfW6NVq8aTwZv7F8qKvJpMm6mJv7Jf9Mz0e/5tT3Wl7Q5J5fvA5XLHMrPKWXPbG
7d0qPRdvBqYGzZFkDJM0PcYn2x5hVJ2L3N+0A0F+3pGJqKM1vL0CjLFkVp3n9q8T
9Z5xqU1Q1i5WQF5R5zj2LV8V6QoYlU2qXj1O5W7w0f6Saa0VWfF5KsxJnI1F7c0c
2zk3LZRG3cNmNhcqxV5n5W9m3v3P9HkWIlkF3M5D8C5MWPH0xYSp0C3k2KE8s8jk
5E9Fj5B8N3L3kF5E8D8b8B5c8JkL5K5c3Jk3L3M3B8S3J5K8s8L8B8A8k8K5J3J5
K8K5L5c8jECgYEAxQ3TS5Q5HqFq5M5l5q5H5M5K5j5F5V5B5D5W5Q5T5X5S5Z5R
5Y5C5G5P5N5L5A5E5I5U5O5W5T5S5Q5R5P5O5N5M5L5K5J5I5H5G5F5D5S5A5
Z5X5C5V5B5N5M5A5S5D5F5G5H5J5K5L5P5O5I5U5Y5T5R5E5W5Q5S5X5Z5C5
R5T5Y5U5I5O5P5A5S5D5F5G5ECgYEAwXl5nJ5L5K5j5H5G5f5D5s5A5Z5X5C5
-----END RSA PRIVATE KEY-----`;

  const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAlkja/yfBxFKwBWyLzNPd
qXaJKZfv8MsKPPbLMhOqTrELxnI25DBM/QL2eLDJHjKMzDvqVjBa9X8ZxyMEkq9D
XOo1F3v5I8JPhAqMCMz3R5KLXU5dXWmWXy7K/m9FwNqqp9E8j7aN6SaFFkSWSG3u
VwVnwvhvyWgJx5UBJB9hIHmVsLFpeYDM1cH8qOGR9bC8dHhsyLCgIqZaLKlBQr9h
iqoqPfqHVvBdT9aKcmrqFnmVlCQL0bfTPd7vfCSCCZ7qIpJhNgouQ6H8K/8lUI8e
A8zk+5jZ9fvCi0nPPDU7p3BVxW7sqqQxJHGLIAWL1FJTHX6E8T8aqNlV8k7K+jZC
VwIDAQAB
-----END PUBLIC KEY-----`;

  return {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: 'jwt-key',
      namespace,
    },
    type: 'Opaque',
    stringData: {
      'jwtRS256.key': privateKey,
      'jwtRS256.key.pub': publicKey,
    },
  };
}

/**
 * Creates a ServiceAccount for Bank of Anthos
 */
function createServiceAccount(namespace: string): object {
  return {
    apiVersion: 'v1',
    kind: 'ServiceAccount',
    metadata: {
      name: 'bank-of-anthos',
      namespace,
    },
  };
}

/**
 * Manifest generator for Bank of Anthos
 */
export const bankOfAnthosManifests: DemoManifestGenerator = {
  generate(options: ManifestOptions): string {
    const manifests: object[] = [];
    const namespace = options.config.namespace;
    const demoId = options.config.id;
    const envOverrides = options.envOverrides || {};

    // Add common manifests (namespace, collector, etc.)
    manifests.push(...createCommonManifests(options));

    // Add Bank of Anthos specific ConfigMaps and Secrets
    manifests.push(...createConfigMaps(namespace));
    manifests.push(createJwtSecret(namespace));
    manifests.push(createServiceAccount(namespace));

    // Get all services for this demo
    const services = options.config.getServices(options.version);

    // Deploy each service
    for (const svc of services) {
      let finalEnv = { ...svc.env };

      // Apply scenario overrides (take precedence)
      const serviceEnvOverrides = envOverrides[svc.name] || {};
      finalEnv = { ...finalEnv, ...serviceEnvOverrides };

      manifests.push(
        createDeployment({
          name: svc.name,
          namespace,
          demoId,
          image: svc.image,
          ports: svc.port ? [svc.port] : [],
          env: finalEnv,
        })
      );

      if (svc.port) {
        manifests.push(createService(svc.name, namespace, [svc.port]));
      }
    }

    // Frontend NodePort for external access
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
              port: 80,
              targetPort: 8080,
              nodePort: options.config.frontendService.nodePort,
            },
          ],
        },
      });
    }

    return manifests.map((m) => yaml.dump(m)).join('---\n');
  },
};
