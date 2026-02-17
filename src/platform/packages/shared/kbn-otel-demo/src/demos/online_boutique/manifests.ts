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

  // ClusterRole for k8sattributes
  manifests.push({
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'ClusterRole',
    metadata: {
      name: 'otel-collector',
    },
    rules: [
      {
        apiGroups: [''],
        resources: ['pods', 'namespaces'],
        verbs: ['get', 'watch', 'list'],
      },
      {
        apiGroups: ['apps'],
        resources: ['replicasets'],
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
              ],
              livenessProbe: {
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
 * Manifest generator for Google Online Boutique
 */
export const onlineBoutiqueManifests: DemoManifestGenerator = {
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
              port: 8080,
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
