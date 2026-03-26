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
  mountJwtKeys?: boolean;
}): object {
  const envList = opts.env
    ? Object.entries(opts.env).map(([name, value]) => ({ name, value }))
    : [];

  const container: Record<string, unknown> = {
    name: opts.name,
    image: opts.image,
    ...(opts.ports && { ports: opts.ports.map((p) => ({ containerPort: p })) }),
    ...(envList.length > 0 && { env: envList }),
  };

  const podSpec: Record<string, unknown> = {
    containers: [container],
  };

  if (opts.mountJwtKeys) {
    container.volumeMounts = [
      {
        name: 'keys',
        mountPath: '/tmp/.ssh',
        readOnly: true,
      },
    ];
    podSpec.volumes = [
      {
        name: 'keys',
        secret: {
          secretName: 'jwt-key',
          items: [
            { key: 'jwtRS256.key', path: 'privatekey' },
            { key: 'jwtRS256.key.pub', path: 'publickey' },
          ],
        },
      },
    ];
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
  // Generated 4096-bit RSA key pair for JWT signing (PKCS#8 format)
  // Using `data` (base64) instead of `stringData` to avoid YAML serialization issues with multiline PEM content
  const privateKeyBase64 =
    'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUpRZ0lCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQ1N3d2dna29BZ0VBQW9JQ0FRRElWajRPbktOM2FhL3IKV3kyaUpKN1pVU0k4UUQrOGgxdE9HT3ZvNFdDbHVyK2V3SUoxN2lMYkR6RkZ1ZmN0UHBLcnVqVHlyS3d3ZHJLcQpDejlGVHZBME5aTDFHb0p1VnNZb1pQcS95QnZvcit3ZzZDU3R5NmVORFdJY2t0bTZVSGh3WlB5am5hUGlydDJiCk9DNnNsU3p1Szdxb0tIZFYvLzZOc3VHd0VJckxRQlRzYUtuSE56bTRnSE1nU2g0cHhBS2JzZFhkV2ZjZU9NZ2gKWEJ4NUpDQkRCWjBLMzViWUFkZGZUTkxyNjFEN0Jhb0FjT24yb3BRL2tmQjh2ZXpGTFhKUlZpK2Y5UktsQmpMdAo3WUppVjd4akNISThFWlczazVhaW1DVzJBWktQNmVUdzI2bHFaRDFmaEdIeU1hUTF3SWFmejlyRjNTN3BiRDAzCmZ1Z3B2bUo1VlliL1NIUGtGR2VCZjVMWCtlbGtDWlpKT1JlaXFzVlVPNjY5dWZzZ0RWMVNMVUo3NzZZNlhaYTEKejk4U2ZCK3Z4SUcrTVZuRXFQVndiNlBwQzNpNWZXUmlIMUNneHU2Tk1aR1NFWDBUUG44Z2RmcGtxREpnd1kvagpvL1JTckF1Y1NEYSs3UE1hMGE1Q3diR3liczRxRGlSN2VmUVFoWU54SE4yU2hiZlkrUTdCRDUxeFRvN2Myb3RMCnJqanJPSjI5dFh1OVRpbWEyNGg0VlA1SXRLMnlJSkxOT0NIcEZWd3pISXhHWVNqTDZXckwyWXhmZXQ3Q1hFa1MKc0FXWkxBRnhCSU1SL3FlMTMxLzEvcWp1OVRDTGFiV3YyK1pxdFpBbnNkMTVuYnQ2N05JYzRHZ2lLVlZndkNXWApMbnVyTFk4YzNaSlZ6b2NLa0xlSjFkMW9rczJPRndJREFRQUJBb0lDQURzcVZUdUZnVFYwRGhOcEl5bit2TGNiCm9ndS9RZE9RK2lNdmN3U2RBeWtPNVNhaVhpVXNCamxCM0dCbVVweVhIVVFBUTBEa1JCb3dCQVg2T2w1aXVNZ0MKaG50Q3NBQ2NPZnVXRHdQeXVtTlhDVnFTbExxTEtkbWJlVDFORldaVCs2M2Q5VXJ3OUlTdTloMndVd0IvTWZ6SgpCMkJBU3pZbjIyckh5S1Z4elR2SG1pWlRwc2lDQTliOGdJT3B3QXkvcWJHSHJNeXBsRFRsdWgwNEVlU3BDYW9oCmowYTF6OXZOZDJqYXpIUUdWQzArZC8yWFcxR09wRSs5N3hNNEdDUUhqdnA4aEtZdC82cWpFUWw1bW9jbXVDbGIKUmpsOVRBVWlYbHQ0cWJKOTltWHdRci9yYjdaUEVsMFNRTWNCYUNqRHlqNkthV2NFTXFXWFpPRHQ1dXpsSURtRgpEY3N3RWYwL0prckppeVVMNEtLTUZZQ1FQemNRc2hVYnlydG4xVkFVekhRZEV4M1l4VUNCdGxQTjdUQ2oyOG50CmFOcHFPQ1pUTDlFbkRMTmtFcXU0MjRLbzNZZ2hwcnpJaDQ4VmhpWVBaemlOeUJmckxkTUk1OHVCYmpSSkc5RTAKR3RTTzdlaTA3ajNJT3hZOUU2WGpESmxYYk04UjkrUnNoLy9CMENBYng3RVRCdHhQbUdENmkxQzNQak5XWWo2OQpjTE0xbUFtL1hhb256bUtNZmdXek1RZ3VxSXhyYlNOdSs1dERrS2t2TlFKdTh4RzlhV0x5UmhndVUreGtybk90CnRaQVZJTVlsRTl0clRqM25PbHA0Vms0NGhRY3BoMWVESmFWbjd0MUxLMTBSZ2FvTk5TbkhnSVpJZHpkQkd0a2kKdnNzT3REN2liWm4xSFNVa29iTlpBb0lCQVFEMmFZVzdZaGVPM1dOMHVaeGNGNlBYcmRPK1JiSkdPV284RzllKwo4azRncGpSZVhhaUI5N0R1V3E5OEpOeUh3QzZ3aURheW9waTFoSXpTaVh4NTV1YXlrZzRYRmFHMFY0OGJ5VisxCkhRNW5zamdBUVVSMTVTdGNtenZ1QlZETVFMemhON2NOa0hzL1p4eGQ3SllVWTU0anV3T0ZQaWdRVnBTSjI5OWIKZXNyQlN3UllkVDVkMTRkWWJ1NTBCc2VWcDN4VU9kUkg3YmZsQlRUa0ZyVE9IN3J6Vnp4SXFxQW5GL3VoWTgxWgpYcm5hS05RYi9VaVplUEwvUEt1ejdmdUJxZ3dMV1UxYkREOEJRanlvWDlWdUhvYlpWVWRNdUNhdFc3dGJYMWZZCmZIVmt5bWlScWlqbVcxVllHMGZ0RFprQjR0dDh6Uzh2eDNyZDRYRGp5QXNsUDlON0FvSUJBUURRSWNVdXExUWUKVTFqV0t3Z0U5dGg3allmdkl5akFscFBHck45cHFrTzJGU0hJU203dlAzRitzdEdkcWZZSHJad2ZxMzZ5eCsrTgoxU3NhNEdGUTJleVFXQXE1d1RneUdPS0JFa0hmM3RQUWErZXhVNkVQS1hzV3NrZGc4WkJWVW9IQ1pDcGJmMEFhCnJ5Q3lNU09aWTZ0UnpDeFc0RWVGR2JzWG5FbTlGTTdqN0pISktNTmxERDJzelY4cURCNVB6K1dRdU1USy9TbG0KK1FNNFNheW1MR0NoRXd4YlJCVjNib1JnOFVuUE1hTkdsUEZUZlJEUSsxdWl0bEZkOE9FRkx2VEJ6b3djNVk1TwptNkpjUVZVOVEwY0xjK0krOVZmRm5abW9wMnI4TENoVWVqNC93b3J0YVVzUlhzcGE4MXZUTmxuRjdZSDRKK0oyCklocjVHdnViZHc4VkFvSUJBQnJ3akhOaEZReEVmZ1FiNnRGU3NGSDdLaVFxUUlSVzhKdGp1K0dmWWhWRnRvSCsKb1ZhY090YkVTVjA4Tm5RTStjM0pCcG5mRnV6NWNkL3VzaEl0d1ZrU2lNSFRWcHQ5MnlLQmtKb2ZkQnk0S2xFMAowWVJHS3NoMEhFZzRnbzNpSWdSSmNCVG1qK0x0cGZkS3oxbXBUbmUva1hIMnlyQ0dsclMvdWhxcFFST0MzUlhDCnM2L1V5WEpNcG5zKzVvRWhENEd4MU5pTVQ4ZVZHeVE0cTBuQnhGR29YdW5lNWFXQWhMMHZTUnNWTlNKNXhqN04KSVN2T1FsclBTa0pncVZlU3ZNQmM0ZzByT0pRdHBxNE4xQ3EyNGExUEduMXp3SjdCWWFscXNoTDBBRzJsaDJzdApmRTA2L1FpbDZ1WXF6MmlhWWI2eVBBOXdNcW1oWlJNeUlxM08zWk1DZ2dFQU4xUWk1UXNxcTMwZ3FwNTUzVWY1CnVLNmhLbE5BYkNJYldyOXVETnIwY1IwaEErdTFuZWhSdFlxMzZwL2FCYVNEVW0vMm1IUktISHhFbnpweTVGbHEKWjl6ZnpRMnVjTExvMDhNVXUveXlkaitaTWl5M0xoNnEyQmZBbmViWnBiVHZSY3YyN3FmZlZMaWxpbmxCcTI4eApoZWN2Q2xGSThmc3JIMVd1ekpNUmhNbkkzNTcwZ3BKRWV3R0ZnTm9EM05lNWdVVjlHekU5cG1BZ0dRQ000d2Y5CkVCVE9QaHpWVUJDVEpHcEFZdEloUTR3b3N6Y1dGMWdhdmlDVmROR3FJQVNoa0R2bVIzQkc2bUs1UUtrbGpjbXEKdzBLbExITndSOXBqbE5BY3dyakNaK0t2VmFmVDR0VVEzYWREUi9aVnZNcEFCenZpUnlQak1lQlRKMUdpL1dzagpHUUtDQVFFQW9CV2RjMjBiNlArN2NydVc5bTR1bHd2M0MzR01LU0RPL0tiajFBbGM4VldiRnFJV0dla01kWEZHClFVQXc2b3NJZzhoWUttVyt6NWsyZlF3alE2aEZXVTBDUFVIdXVMemM2MVo4QmxNWTdpQmQwSFBJK08xVmJkUWsKczJvZ2pPQUVya3hrSnlIUTZqKzAvbi9tcVgvTldLS2l0SkFXMVpuQmNzNzRRKzRYQzhiWkNPd3pNTUJzNC9KVApqRDN3T0c2NUVnYkkwNDg5blNGekJsbEd3VnhnaTZmb1YwL094TlVWaVh1Y0lGcDUrYnBlUndmcThja3JBOHA3CnZHK2xLWHpwbld4VC9sLzJJZXlSTDJETWs2YUxhbFNqS21wcmxueFB1djkyZ1hPbmY4WDdKMkhvK04wNnpzNWoKeTRNSGQzNndiV3RDMXJtYi8wRnkyU2d1L3BGOTBRPT0KLS0tLS1FTkQgUFJJVkFURSBLRVktLS0tLQo=';

  const publicKeyBase64 =
    'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQ0lqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FnOEFNSUlDQ2dLQ0FnRUF5RlkrRHB5amQybXY2MXN0b2lTZQoyVkVpUEVBL3ZJZGJUaGpyNk9GZ3BicS9uc0NDZGU0aTJ3OHhSYm4zTFQ2U3E3bzA4cXlzTUhheXFncy9SVTd3Ck5EV1M5UnFDYmxiR0tHVDZ2OGdiNksvc0lPZ2tyY3VualExaUhKTFp1bEI0Y0dUOG81Mmo0cTdkbXpndXJKVXMKN2l1NnFDaDNWZi8ramJMaHNCQ0t5MEFVN0dpcHh6YzV1SUJ6SUVvZUtjUUNtN0hWM1ZuM0hqaklJVndjZVNRZwpRd1dkQ3QrVzJBSFhYMHpTNit0USt3V3FBSERwOXFLVVA1SHdmTDNzeFMxeVVWWXZuL1VTcFFZeTdlMkNZbGU4Cll3aHlQQkdWdDVPV29wZ2x0Z0dTaituazhOdXBhbVE5WDRSaDhqR2tOY0NHbjgvYXhkMHU2V3c5TjM3b0tiNWkKZVZXRy8waHo1QlJuZ1grUzEvbnBaQW1XU1RrWG9xckZWRHV1dmJuN0lBMWRVaTFDZSsrbU9sMld0Yy9mRW53ZgpyOFNCdmpGWnhLajFjRytqNlF0NHVYMWtZaDlRb01idWpUR1JraEY5RXo1L0lIWDZaS2d5WU1HUDQ2UDBVcXdMCm5FZzJ2dXp6R3RHdVFzR3hzbTdPS2c0a2UzbjBFSVdEY1J6ZGtvVzMyUGtPd1ErZGNVNk8zTnFMUzY0NDZ6aWQKdmJWN3ZVNHBtdHVJZUZUK1NMU3RzaUNTelRnaDZSVmNNeHlNUm1Fb3krbHF5OW1NWDNyZXdseEpFckFGbVN3QgpjUVNERWY2bnRkOWY5ZjZvN3ZVd2kybTFyOXZtYXJXUUo3SGRlWjI3ZXV6U0hPQm9JaWxWWUx3bGx5NTdxeTJQCkhOMlNWYzZIQ3BDM2lkWGRhSkxOamhjQ0F3RUFBUT09Ci0tLS0tRU5EIFBVQkxJQyBLRVktLS0tLQo=';

  return {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: 'jwt-key',
      namespace,
    },
    type: 'Opaque',
    data: {
      'jwtRS256.key': privateKeyBase64,
      'jwtRS256.key.pub': publicKeyBase64,
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

    // Services that need JWT keys mounted for authentication
    const servicesNeedingJwtKeys = new Set([
      'userservice',
      'contacts',
      'ledgerwriter',
      'balancereader',
      'transactionhistory',
      'frontend',
    ]);

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
          mountJwtKeys: servicesNeedingJwtKeys.has(svc.name),
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

    return manifests.map((m) => yaml.dump(m, { lineWidth: -1 })).join('---\n');
  },
};
