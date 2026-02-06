/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import yaml from 'js-yaml';

const OTEL_DEMO_VERSION = '1.12.0';
const NAMESPACE = 'otel-demo';

interface K8sManifestOptions {
  elasticsearchEndpoint: string;
  username: string;
  password: string;
  logsIndex: string;
  collectorConfigYaml: string;
  /** Per-service environment variable overrides from failure scenarios */
  envOverrides?: Record<string, Record<string, string>>;
}

/**
 * Generates Kubernetes manifests for the OTel Demo deployment.
 * Uses k8sattributes processor for proper container/pod metadata enrichment.
 */
export function getKubernetesManifests(options: K8sManifestOptions): string {
  const manifests: object[] = [];

  // Namespace
  manifests.push({
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: {
      name: NAMESPACE,
      labels: {
        'app.kubernetes.io/name': 'otel-demo',
      },
    },
  });

  // OTel Collector ConfigMap
  manifests.push({
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: 'otel-collector-config',
      namespace: NAMESPACE,
    },
    data: {
      'otel-collector-config.yaml': options.collectorConfigYaml,
    },
  });

  // Flagd ConfigMap
  manifests.push({
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: 'flagd-config',
      namespace: NAMESPACE,
    },
    data: {
      'demo.flagd.json': JSON.stringify(getFlagdConfig(), null, 2),
    },
  });

  // OTel Collector ServiceAccount (needed for k8sattributes)
  manifests.push({
    apiVersion: 'v1',
    kind: 'ServiceAccount',
    metadata: {
      name: 'otel-collector',
      namespace: NAMESPACE,
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
    roleRef: {
      apiGroup: 'rbac.authorization.k8s.io',
      kind: 'ClusterRole',
      name: 'otel-collector',
    },
    subjects: [
      {
        kind: 'ServiceAccount',
        name: 'otel-collector',
        namespace: NAMESPACE,
      },
    ],
  });

  // OTel Collector Deployment (with log volume mounts for filelog receiver)
  manifests.push({
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: 'otel-collector',
      namespace: NAMESPACE,
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
              image:
                'ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib:0.114.0',
              args: ['--config', '/etc/otel-collector/otel-collector-config.yaml'],
              ports: [
                { containerPort: 4317, name: 'otlp-grpc' },
                { containerPort: 4318, name: 'otlp-http' },
                { containerPort: 13133, name: 'health' },
              ],
              securityContext: {
                runAsUser: 0, // Run as root to read log files
                runAsGroup: 0,
                privileged: true, // Required to read host log files
                readOnlyRootFilesystem: false,
              },
              volumeMounts: [
                {
                  name: 'config',
                  mountPath: '/etc/otel-collector',
                },
                {
                  name: 'varlogpods',
                  mountPath: '/var/log/pods',
                  readOnly: true,
                },
                {
                  name: 'varlogcontainers',
                  mountPath: '/var/log/containers',
                  readOnly: true,
                },
                {
                  name: 'varlibdockercontainers',
                  mountPath: '/var/lib/docker/containers',
                  readOnly: true,
                },
              ],
              env: [
                { name: 'K8S_NODE_NAME', valueFrom: { fieldRef: { fieldPath: 'spec.nodeName' } } },
                { name: 'K8S_POD_NAME', valueFrom: { fieldRef: { fieldPath: 'metadata.name' } } },
                {
                  name: 'K8S_POD_NAMESPACE',
                  valueFrom: { fieldRef: { fieldPath: 'metadata.namespace' } },
                },
                { name: 'K8S_POD_IP', valueFrom: { fieldRef: { fieldPath: 'status.podIP' } } },
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
      namespace: NAMESPACE,
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

  // Valkey (Redis) for Cart Service
  manifests.push(
    createDeployment({
      name: 'valkey',
      image: 'valkey/valkey:8-alpine',
      ports: [6379],
    })
  );
  manifests.push(createService('valkey', [6379]));

  // Flagd
  manifests.push(
    createDeployment({
      name: 'flagd',
      image: 'ghcr.io/open-feature/flagd:v0.11.4',
      args: ['start', '--uri', 'file:/etc/flagd/demo.flagd.json', '--port', '8013'],
      ports: [8013],
      volumeMounts: [{ name: 'config', mountPath: '/etc/flagd' }],
      volumes: [{ name: 'config', configMap: { name: 'flagd-config' } }],
    })
  );
  manifests.push(createService('flagd', [8013]));

  // Core Demo Services
  const demoServices = [
    {
      name: 'cart',
      image: `ghcr.io/open-telemetry/demo:${OTEL_DEMO_VERSION}-cartservice`,
      ports: [7070],
      env: {
        CART_SERVICE_PORT: '7070',
        VALKEY_ADDR: 'valkey:6379',
        ASPNETCORE_URLS: 'http://*:7070',
        FLAGD_HOST: 'flagd',
        FLAGD_PORT: '8013',
      },
    },
    {
      name: 'currency',
      image: `ghcr.io/open-telemetry/demo:${OTEL_DEMO_VERSION}-currencyservice`,
      ports: [7285],
      env: {
        CURRENCY_SERVICE_PORT: '7285',
        VERSION: OTEL_DEMO_VERSION,
      },
    },
    {
      name: 'email',
      image: `ghcr.io/open-telemetry/demo:${OTEL_DEMO_VERSION}-emailservice`,
      ports: [6060],
      env: {
        APP_ENV: 'production',
        EMAIL_SERVICE_PORT: '6060',
      },
    },
    {
      name: 'payment',
      image: `ghcr.io/open-telemetry/demo:${OTEL_DEMO_VERSION}-paymentservice`,
      ports: [50051],
      env: {
        PAYMENT_SERVICE_PORT: '50051',
        FLAGD_HOST: 'flagd',
        FLAGD_PORT: '8013',
      },
    },
    {
      name: 'product-catalog',
      image: `ghcr.io/open-telemetry/demo:${OTEL_DEMO_VERSION}-productcatalogservice`,
      ports: [3550],
      env: {
        PRODUCT_CATALOG_SERVICE_PORT: '3550',
        FLAGD_HOST: 'flagd',
        FLAGD_PORT: '8013',
      },
    },
    {
      name: 'quote',
      image: `ghcr.io/open-telemetry/demo:${OTEL_DEMO_VERSION}-quoteservice`,
      ports: [8090],
      env: {
        QUOTE_SERVICE_PORT: '8090',
        OTEL_PHP_AUTOLOAD_ENABLED: 'true',
      },
    },
    {
      name: 'shipping',
      image: `ghcr.io/open-telemetry/demo:${OTEL_DEMO_VERSION}-shippingservice`,
      ports: [50051],
      env: {
        SHIPPING_SERVICE_PORT: '50051',
        QUOTE_SERVICE_ADDR: 'http://quote:8090',
      },
    },
    {
      name: 'ad',
      image: `ghcr.io/open-telemetry/demo:${OTEL_DEMO_VERSION}-adservice`,
      ports: [9555],
      env: {
        AD_SERVICE_PORT: '9555',
        FLAGD_HOST: 'flagd',
        FLAGD_PORT: '8013',
        OTEL_LOGS_EXPORTER: 'otlp',
      },
    },
    {
      name: 'recommendation',
      image: `ghcr.io/open-telemetry/demo:${OTEL_DEMO_VERSION}-recommendationservice`,
      ports: [9001],
      env: {
        RECOMMENDATION_SERVICE_PORT: '9001',
        PRODUCT_CATALOG_SERVICE_ADDR: 'product-catalog:3550',
        FLAGD_HOST: 'flagd',
        FLAGD_PORT: '8013',
        OTEL_PYTHON_LOG_CORRELATION: 'true',
        PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION: 'python',
      },
    },
    {
      name: 'checkout',
      image: `ghcr.io/open-telemetry/demo:${OTEL_DEMO_VERSION}-checkoutservice`,
      ports: [5050],
      env: {
        CHECKOUT_SERVICE_PORT: '5050',
        CART_SERVICE_ADDR: 'cart:7070',
        CURRENCY_SERVICE_ADDR: 'currency:7285',
        EMAIL_SERVICE_ADDR: 'http://email:6060',
        PAYMENT_SERVICE_ADDR: 'payment:50051',
        PRODUCT_CATALOG_SERVICE_ADDR: 'product-catalog:3550',
        SHIPPING_SERVICE_ADDR: 'shipping:50051',
        FLAGD_HOST: 'flagd',
        FLAGD_PORT: '8013',
      },
    },
    {
      name: 'frontend',
      image: `ghcr.io/open-telemetry/demo:${OTEL_DEMO_VERSION}-frontend`,
      ports: [8080],
      env: {
        PORT: '8080',
        FRONTEND_ADDR: ':8080',
        AD_SERVICE_ADDR: 'ad:9555',
        CART_SERVICE_ADDR: 'cart:7070',
        CHECKOUT_SERVICE_ADDR: 'checkout:5050',
        CURRENCY_SERVICE_ADDR: 'currency:7285',
        PRODUCT_CATALOG_SERVICE_ADDR: 'product-catalog:3550',
        RECOMMENDATION_SERVICE_ADDR: 'recommendation:9001',
        SHIPPING_SERVICE_ADDR: 'shipping:50051',
        OTEL_COLLECTOR_HOST: 'otel-collector',
        FLAGD_HOST: 'flagd',
        FLAGD_PORT: '8013',
        ENV_PLATFORM: 'local',
        WEB_OTEL_SERVICE_NAME: 'frontend-web',
      },
    },
    {
      name: 'load-generator',
      image: `ghcr.io/open-telemetry/demo:${OTEL_DEMO_VERSION}-loadgenerator`,
      ports: [8089],
      env: {
        LOCUST_WEB_PORT: '8089',
        LOCUST_HOST: 'http://frontend:8080',
        LOCUST_HEADLESS: 'false',
        LOCUST_AUTOSTART: 'true',
        LOCUST_USERS: '10',
        LOCUST_WEB_HOST: '0.0.0.0',
        FLAGD_HOST: 'flagd',
        FLAGD_PORT: '8013',
        PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION: 'python',
      },
    },
  ];

  // Services that use HTTP for OTLP exports (not gRPC)
  const httpOtlpServices = ['quote', 'email', 'accounting', 'ad', 'fraud-detection'];

  // Extract env overrides from options
  const envOverrides = options.envOverrides || {};

  for (const svc of demoServices) {
    // Use HTTP port (4318) for services that don't support gRPC, gRPC port (4317) for others
    const otlpPort = httpOtlpServices.includes(svc.name) ? '4318' : '4317';

    // Merge service env with scenario overrides (overrides take precedence)
    const serviceEnvOverrides = envOverrides[svc.name] || {};
    const finalEnv = {
      ...(svc.env as unknown as Record<string, string>),
      OTEL_EXPORTER_OTLP_ENDPOINT: `http://otel-collector:${otlpPort}`,
      OTEL_RESOURCE_ATTRIBUTES: 'service.namespace=otel-demo',
      OTEL_SERVICE_NAME: svc.name,
      ...serviceEnvOverrides, // Scenario overrides applied last
    };

    manifests.push(
      createDeployment({
        name: svc.name,
        image: svc.image,
        ports: svc.ports,
        env: finalEnv,
      })
    );
    manifests.push(createService(svc.name, svc.ports));
  }

  // Frontend NodePort for external access
  manifests.push({
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name: 'frontend-external',
      namespace: NAMESPACE,
    },
    spec: {
      type: 'NodePort',
      selector: {
        app: 'frontend',
      },
      ports: [{ port: 8080, targetPort: 8080, nodePort: 30080 }],
    },
  });

  return manifests.map((m) => yaml.dump(m)).join('---\n');
}

function createDeployment(opts: {
  name: string;
  image: string;
  ports: number[];
  env?: Record<string, string>;
  args?: string[];
  volumeMounts?: Array<{ name: string; mountPath: string }>;
  volumes?: Array<{ name: string; configMap?: { name: string } }>;
}): object {
  const envList = opts.env
    ? Object.entries(opts.env).map(([name, value]) => ({ name, value }))
    : [];

  return {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: opts.name,
      namespace: NAMESPACE,
      labels: {
        app: opts.name,
        'app.kubernetes.io/name': opts.name,
        'app.kubernetes.io/part-of': 'otel-demo',
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
            'app.kubernetes.io/part-of': 'otel-demo',
          },
        },
        spec: {
          containers: [
            {
              name: opts.name,
              image: opts.image,
              ...(opts.args && { args: opts.args }),
              ports: opts.ports.map((p) => ({ containerPort: p })),
              env: envList,
              ...(opts.volumeMounts && { volumeMounts: opts.volumeMounts }),
            },
          ],
          ...(opts.volumes && { volumes: opts.volumes }),
        },
      },
    },
  };
}

function createService(name: string, ports: number[]): object {
  return {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name,
      namespace: NAMESPACE,
    },
    spec: {
      selector: {
        app: name,
      },
      ports: ports.map((p) => ({ port: p, targetPort: p })),
    },
  };
}

function getFlagdConfig(): object {
  return {
    flags: {
      productCatalogFailure: {
        state: 'ENABLED',
        variants: { on: true, off: false },
        defaultVariant: 'off',
      },
      recommendationServiceCacheFailure: {
        state: 'ENABLED',
        variants: { on: true, off: false },
        defaultVariant: 'off',
      },
      adServiceManualGc: {
        state: 'ENABLED',
        variants: { on: true, off: false },
        defaultVariant: 'off',
      },
      adServiceHighCpu: {
        state: 'ENABLED',
        variants: { on: true, off: false },
        defaultVariant: 'off',
      },
      cartServiceFailure: {
        state: 'ENABLED',
        variants: { on: true, off: false },
        defaultVariant: 'off',
      },
      paymentServiceFailure: {
        state: 'ENABLED',
        variants: { on: true, off: false },
        defaultVariant: 'off',
      },
      paymentServiceUnreachable: {
        state: 'ENABLED',
        variants: { on: true, off: false },
        defaultVariant: 'off',
      },
      loadgeneratorFloodHomepage: {
        state: 'ENABLED',
        variants: { on: true, off: false },
        defaultVariant: 'off',
      },
      kafkaQueueProblems: {
        state: 'ENABLED',
        variants: { on: true, off: false },
        defaultVariant: 'off',
      },
      imageSlowLoad: {
        state: 'ENABLED',
        variants: { on: true, off: false },
        defaultVariant: 'off',
      },
    },
  };
}
