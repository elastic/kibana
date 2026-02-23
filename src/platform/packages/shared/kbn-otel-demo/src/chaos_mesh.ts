/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';

/**
 * Chaos Mesh experiment types
 */
export type ChaosExperimentType =
  | 'pod-kill'
  | 'pod-failure'
  | 'container-kill'
  | 'network-delay'
  | 'network-loss'
  | 'network-partition'
  | 'io-latency'
  | 'io-fault'
  | 'cpu-stress'
  | 'memory-stress'
  | 'http-abort'
  | 'http-delay';

/**
 * Category of chaos experiment based on impact
 */
export type ChaosCategory = 'pod' | 'network' | 'io' | 'stress' | 'http';

/**
 * Base interface for all chaos experiments
 */
export interface BaseChaosExperiment {
  id: string;
  name: string;
  description: string;
  type: ChaosExperimentType;
  category: ChaosCategory;
  namespace: string;
  duration?: string;
  selector: {
    labelSelectors?: Record<string, string>;
    namespaces?: string[];
    pods?: Record<string, string[]>;
  };
}

/**
 * PodChaos experiment configuration
 */
export interface PodChaosExperiment extends BaseChaosExperiment {
  category: 'pod';
  type: 'pod-kill' | 'pod-failure' | 'container-kill';
  action: 'pod-kill' | 'pod-failure' | 'container-kill';
  mode: 'one' | 'all' | 'fixed' | 'fixed-percent' | 'random-max-percent';
  value?: string;
  containerNames?: string[];
  gracePeriod?: number;
}

/**
 * NetworkChaos experiment configuration
 */
export interface NetworkChaosExperiment extends BaseChaosExperiment {
  category: 'network';
  type: 'network-delay' | 'network-loss' | 'network-partition';
  action: 'delay' | 'loss' | 'duplicate' | 'corrupt' | 'partition';
  mode: 'one' | 'all' | 'fixed' | 'fixed-percent' | 'random-max-percent';
  value?: string;
  delay?: {
    latency: string;
    correlation?: string;
    jitter?: string;
  };
  loss?: {
    loss: string;
    correlation?: string;
  };
  direction?: 'to' | 'from' | 'both';
  target?: {
    mode: 'one' | 'all' | 'fixed' | 'fixed-percent' | 'random-max-percent';
    selector: {
      labelSelectors?: Record<string, string>;
      namespaces?: string[];
    };
  };
}

/**
 * IOChaos experiment configuration
 */
export interface IOChaosExperiment extends BaseChaosExperiment {
  category: 'io';
  type: 'io-latency' | 'io-fault';
  action: 'latency' | 'fault' | 'errno';
  mode: 'one' | 'all' | 'fixed' | 'fixed-percent' | 'random-max-percent';
  value?: string;
  volumePath: string;
  path?: string;
  percent?: number;
  delay?: string;
  errno?: number;
  methods?: string[];
}

/**
 * StressChaos experiment configuration
 */
export interface StressChaosExperiment extends BaseChaosExperiment {
  category: 'stress';
  type: 'cpu-stress' | 'memory-stress';
  mode: 'one' | 'all' | 'fixed' | 'fixed-percent' | 'random-max-percent';
  value?: string;
  stressors: {
    cpu?: {
      workers: number;
      load?: number;
    };
    memory?: {
      workers: number;
      size?: string;
    };
  };
  containerNames?: string[];
}

/**
 * HTTPChaos experiment configuration
 */
export interface HTTPChaosExperiment extends BaseChaosExperiment {
  category: 'http';
  type: 'http-abort' | 'http-delay';
  mode: 'one' | 'all' | 'fixed' | 'fixed-percent' | 'random-max-percent';
  value?: string;
  target: 'Request' | 'Response';
  port: number;
  path?: string;
  method?: string;
  abort?: boolean;
  delay?: string;
  replace?: {
    headers?: Record<string, string>;
    body?: string;
  };
  patch?: {
    headers?: string[][];
    body?: {
      type: 'JSON';
      value: string;
    };
  };
}

export type ChaosExperiment =
  | PodChaosExperiment
  | NetworkChaosExperiment
  | IOChaosExperiment
  | StressChaosExperiment
  | HTTPChaosExperiment;

/**
 * Predefined chaos scenarios for demo environments
 */
export interface ChaosScenario {
  id: string;
  name: string;
  description: string;
  experiments: ChaosExperiment[];
}

const CHAOS_MESH_INSTALL_YAML = `https://raw.githubusercontent.com/chaos-mesh/chaos-mesh/v2.6.3/manifests/crd.yaml`;
const CHAOS_MESH_NAMESPACE = 'chaos-mesh';

/**
 * Check if Chaos Mesh CRDs are installed in the cluster
 */
export async function isChaosMeshInstalled(): Promise<boolean> {
  try {
    await execa.command('kubectl get crd podchaos.chaos-mesh.org', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Install Chaos Mesh CRDs and controller to the cluster
 */
export async function installChaosMesh(log: ToolingLog): Promise<void> {
  const installed = await isChaosMeshInstalled();
  if (installed) {
    log.info('Chaos Mesh CRDs already installed');
    return;
  }

  log.info('Installing Chaos Mesh CRDs...');

  // Create namespace
  try {
    await execa.command(`kubectl create namespace ${CHAOS_MESH_NAMESPACE}`, { stdio: 'pipe' });
  } catch {
    // Namespace may already exist
  }

  // Install Chaos Mesh using helm (preferred) or kubectl
  try {
    // Check if helm is available
    await execa.command('helm version --short', { stdio: 'pipe' });

    log.info('Installing Chaos Mesh via Helm...');
    await execa.command('helm repo add chaos-mesh https://charts.chaos-mesh.org', {
      stdio: 'inherit',
    });
    await execa.command('helm repo update', { stdio: 'inherit' });
    await execa.command(
      `helm install chaos-mesh chaos-mesh/chaos-mesh -n ${CHAOS_MESH_NAMESPACE} --set chaosDaemon.runtime=containerd --set chaosDaemon.socketPath=/run/containerd/containerd.sock --version 2.6.3`,
      { stdio: 'inherit' }
    );
  } catch {
    // Fallback to kubectl apply
    log.info('Helm not available, installing Chaos Mesh CRDs via kubectl...');
    await execa.command(`kubectl apply -f ${CHAOS_MESH_INSTALL_YAML}`, { stdio: 'inherit' });
  }

  log.success('Chaos Mesh installed successfully');
}

/**
 * Generate Kubernetes manifest YAML for a PodChaos experiment
 */
function generatePodChaosYaml(experiment: PodChaosExperiment): string {
  const spec: Record<string, unknown> = {
    action: experiment.action,
    mode: experiment.mode,
    selector: experiment.selector,
  };

  if (experiment.value) {
    spec.value = experiment.value;
  }

  if (experiment.containerNames && experiment.containerNames.length > 0) {
    spec.containerNames = experiment.containerNames;
  }

  if (experiment.gracePeriod !== undefined) {
    spec.gracePeriod = experiment.gracePeriod;
  }

  if (experiment.duration) {
    spec.duration = experiment.duration;
  }

  return `apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: ${experiment.id}
  namespace: ${experiment.namespace}
spec:
  action: ${experiment.action}
  mode: ${experiment.mode}
${experiment.value ? `  value: "${experiment.value}"` : ''}
${experiment.duration ? `  duration: "${experiment.duration}"` : ''}
${experiment.gracePeriod !== undefined ? `  gracePeriod: ${experiment.gracePeriod}` : ''}
${
  experiment.containerNames
    ? `  containerNames:\n${experiment.containerNames.map((c) => `    - ${c}`).join('\n')}`
    : ''
}
  selector:
${
  experiment.selector.labelSelectors
    ? `    labelSelectors:\n${Object.entries(experiment.selector.labelSelectors)
        .map(([k, v]) => `      ${k}: "${v}"`)
        .join('\n')}`
    : ''
}
${
  experiment.selector.namespaces
    ? `    namespaces:\n${experiment.selector.namespaces.map((n) => `      - ${n}`).join('\n')}`
    : ''
}`;
}

/**
 * Generate Kubernetes manifest YAML for a NetworkChaos experiment
 */
function generateNetworkChaosYaml(experiment: NetworkChaosExperiment): string {
  let actionSpec = '';

  if (experiment.action === 'delay' && experiment.delay) {
    actionSpec = `  delay:
    latency: "${experiment.delay.latency}"
${experiment.delay.correlation ? `    correlation: "${experiment.delay.correlation}"` : ''}
${experiment.delay.jitter ? `    jitter: "${experiment.delay.jitter}"` : ''}`;
  } else if (experiment.action === 'loss' && experiment.loss) {
    actionSpec = `  loss:
    loss: "${experiment.loss.loss}"
${experiment.loss.correlation ? `    correlation: "${experiment.loss.correlation}"` : ''}`;
  }

  let targetSpec = '';
  if (experiment.target) {
    targetSpec = `  target:
    mode: ${experiment.target.mode}
    selector:
${
  experiment.target.selector.labelSelectors
    ? `      labelSelectors:\n${Object.entries(experiment.target.selector.labelSelectors)
        .map(([k, v]) => `        ${k}: "${v}"`)
        .join('\n')}`
    : ''
}
${
  experiment.target.selector.namespaces
    ? `      namespaces:\n${experiment.target.selector.namespaces
        .map((n) => `        - ${n}`)
        .join('\n')}`
    : ''
}`;
  }

  return `apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: ${experiment.id}
  namespace: ${experiment.namespace}
spec:
  action: ${experiment.action}
  mode: ${experiment.mode}
${experiment.value ? `  value: "${experiment.value}"` : ''}
${experiment.duration ? `  duration: "${experiment.duration}"` : ''}
${experiment.direction ? `  direction: ${experiment.direction}` : ''}
${actionSpec}
  selector:
${
  experiment.selector.labelSelectors
    ? `    labelSelectors:\n${Object.entries(experiment.selector.labelSelectors)
        .map(([k, v]) => `      ${k}: "${v}"`)
        .join('\n')}`
    : ''
}
${
  experiment.selector.namespaces
    ? `    namespaces:\n${experiment.selector.namespaces.map((n) => `      - ${n}`).join('\n')}`
    : ''
}
${targetSpec}`;
}

/**
 * Generate Kubernetes manifest YAML for an IOChaos experiment
 */
function generateIOChaosYaml(experiment: IOChaosExperiment): string {
  return `apiVersion: chaos-mesh.org/v1alpha1
kind: IOChaos
metadata:
  name: ${experiment.id}
  namespace: ${experiment.namespace}
spec:
  action: ${experiment.action}
  mode: ${experiment.mode}
${experiment.value ? `  value: "${experiment.value}"` : ''}
${experiment.duration ? `  duration: "${experiment.duration}"` : ''}
  volumePath: "${experiment.volumePath}"
${experiment.path ? `  path: "${experiment.path}"` : ''}
${experiment.percent !== undefined ? `  percent: ${experiment.percent}` : ''}
${experiment.delay ? `  delay: "${experiment.delay}"` : ''}
${experiment.errno !== undefined ? `  errno: ${experiment.errno}` : ''}
${experiment.methods ? `  methods:\n${experiment.methods.map((m) => `    - ${m}`).join('\n')}` : ''}
  selector:
${
  experiment.selector.labelSelectors
    ? `    labelSelectors:\n${Object.entries(experiment.selector.labelSelectors)
        .map(([k, v]) => `      ${k}: "${v}"`)
        .join('\n')}`
    : ''
}
${
  experiment.selector.namespaces
    ? `    namespaces:\n${experiment.selector.namespaces.map((n) => `      - ${n}`).join('\n')}`
    : ''
}`;
}

/**
 * Generate Kubernetes manifest YAML for a StressChaos experiment
 */
function generateStressChaosYaml(experiment: StressChaosExperiment): string {
  let stressorsSpec = '  stressors:';
  if (experiment.stressors.cpu) {
    stressorsSpec += `
    cpu:
      workers: ${experiment.stressors.cpu.workers}
${
  experiment.stressors.cpu.load !== undefined ? `      load: ${experiment.stressors.cpu.load}` : ''
}`;
  }
  if (experiment.stressors.memory) {
    stressorsSpec += `
    memory:
      workers: ${experiment.stressors.memory.workers}
${experiment.stressors.memory.size ? `      size: "${experiment.stressors.memory.size}"` : ''}`;
  }

  return `apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: ${experiment.id}
  namespace: ${experiment.namespace}
spec:
  mode: ${experiment.mode}
${experiment.value ? `  value: "${experiment.value}"` : ''}
${experiment.duration ? `  duration: "${experiment.duration}"` : ''}
${stressorsSpec}
${
  experiment.containerNames
    ? `  containerNames:\n${experiment.containerNames.map((c) => `    - ${c}`).join('\n')}`
    : ''
}
  selector:
${
  experiment.selector.labelSelectors
    ? `    labelSelectors:\n${Object.entries(experiment.selector.labelSelectors)
        .map(([k, v]) => `      ${k}: "${v}"`)
        .join('\n')}`
    : ''
}
${
  experiment.selector.namespaces
    ? `    namespaces:\n${experiment.selector.namespaces.map((n) => `      - ${n}`).join('\n')}`
    : ''
}`;
}

/**
 * Generate Kubernetes manifest YAML for an HTTPChaos experiment
 */
function generateHTTPChaosYaml(experiment: HTTPChaosExperiment): string {
  return `apiVersion: chaos-mesh.org/v1alpha1
kind: HTTPChaos
metadata:
  name: ${experiment.id}
  namespace: ${experiment.namespace}
spec:
  mode: ${experiment.mode}
${experiment.value ? `  value: "${experiment.value}"` : ''}
${experiment.duration ? `  duration: "${experiment.duration}"` : ''}
  target: ${experiment.target}
  port: ${experiment.port}
${experiment.path ? `  path: "${experiment.path}"` : ''}
${experiment.method ? `  method: ${experiment.method}` : ''}
${experiment.abort !== undefined ? `  abort: ${experiment.abort}` : ''}
${experiment.delay ? `  delay: "${experiment.delay}"` : ''}
  selector:
${
  experiment.selector.labelSelectors
    ? `    labelSelectors:\n${Object.entries(experiment.selector.labelSelectors)
        .map(([k, v]) => `      ${k}: "${v}"`)
        .join('\n')}`
    : ''
}
${
  experiment.selector.namespaces
    ? `    namespaces:\n${experiment.selector.namespaces.map((n) => `      - ${n}`).join('\n')}`
    : ''
}`;
}

/**
 * Generate Kubernetes manifest YAML for a chaos experiment
 */
export function generateExperimentYaml(experiment: ChaosExperiment): string {
  switch (experiment.category) {
    case 'pod':
      return generatePodChaosYaml(experiment as PodChaosExperiment);
    case 'network':
      return generateNetworkChaosYaml(experiment as NetworkChaosExperiment);
    case 'io':
      return generateIOChaosYaml(experiment as IOChaosExperiment);
    case 'stress':
      return generateStressChaosYaml(experiment as StressChaosExperiment);
    case 'http':
      return generateHTTPChaosYaml(experiment as HTTPChaosExperiment);
    default:
      throw new Error(`Unknown chaos experiment category`);
  }
}

/**
 * Apply a chaos experiment to the cluster
 */
export async function applyExperiment(log: ToolingLog, experiment: ChaosExperiment): Promise<void> {
  const yaml = generateExperimentYaml(experiment);

  log.info(`Applying chaos experiment: ${experiment.name}`);
  log.debug(yaml);

  await execa('kubectl', ['apply', '-f', '-'], {
    input: yaml,
    stdio: ['pipe', 'inherit', 'inherit'],
  });

  log.success(`Chaos experiment ${experiment.id} applied`);
}

/**
 * Delete a chaos experiment from the cluster
 */
export async function deleteExperiment(
  log: ToolingLog,
  experiment: ChaosExperiment
): Promise<void> {
  const kind = getChaosKind(experiment);

  log.info(`Deleting chaos experiment: ${experiment.name}`);

  try {
    await execa.command(
      `kubectl delete ${kind} ${experiment.id} -n ${experiment.namespace} --ignore-not-found`,
      { stdio: 'inherit' }
    );
    log.success(`Chaos experiment ${experiment.id} deleted`);
  } catch (error) {
    log.warning(`Could not delete experiment ${experiment.id}: ${error}`);
  }
}

/**
 * Get the Kubernetes kind for a chaos experiment
 */
function getChaosKind(experiment: ChaosExperiment): string {
  switch (experiment.category) {
    case 'pod':
      return 'PodChaos';
    case 'network':
      return 'NetworkChaos';
    case 'io':
      return 'IOChaos';
    case 'stress':
      return 'StressChaos';
    case 'http':
      return 'HTTPChaos';
    default:
      throw new Error(`Unknown chaos category`);
  }
}

/**
 * Apply a chaos scenario (multiple experiments)
 */
export async function applyScenario(log: ToolingLog, scenario: ChaosScenario): Promise<void> {
  log.info(`Applying chaos scenario: ${scenario.name}`);
  log.info(`  ${scenario.description}`);

  for (const experiment of scenario.experiments) {
    await applyExperiment(log, experiment);
  }

  log.success(
    `Chaos scenario ${scenario.id} applied with ${scenario.experiments.length} experiments`
  );
}

/**
 * Delete a chaos scenario (all its experiments)
 */
export async function deleteScenario(log: ToolingLog, scenario: ChaosScenario): Promise<void> {
  log.info(`Removing chaos scenario: ${scenario.name}`);

  for (const experiment of scenario.experiments) {
    await deleteExperiment(log, experiment);
  }

  log.success(`Chaos scenario ${scenario.id} removed`);
}

/**
 * List all active chaos experiments in a namespace
 */
export async function listActiveExperiments(namespace: string): Promise<string[]> {
  const kinds = ['PodChaos', 'NetworkChaos', 'IOChaos', 'StressChaos', 'HTTPChaos'];
  const experiments: string[] = [];

  for (const kind of kinds) {
    try {
      const result = await execa.command(
        `kubectl get ${kind} -n ${namespace} -o jsonpath='{.items[*].metadata.name}'`,
        { stdio: 'pipe' }
      );
      if (result.stdout) {
        experiments.push(
          ...result.stdout
            .split(' ')
            .filter(Boolean)
            .map((name) => `${kind}/${name}`)
        );
      }
    } catch {
      // CRD might not exist or no experiments
    }
  }

  return experiments;
}

/**
 * Delete all chaos experiments in a namespace
 */
export async function deleteAllExperiments(log: ToolingLog, namespace: string): Promise<void> {
  log.info(`Removing all chaos experiments in namespace ${namespace}...`);

  const kinds = ['PodChaos', 'NetworkChaos', 'IOChaos', 'StressChaos', 'HTTPChaos'];

  for (const kind of kinds) {
    try {
      await execa.command(`kubectl delete ${kind} --all -n ${namespace} --ignore-not-found`, {
        stdio: 'pipe',
      });
    } catch {
      // CRD might not exist
    }
  }

  log.success('All chaos experiments removed');
}

/**
 * Create predefined chaos scenarios for a demo namespace
 */
export function createChaosScenarios(namespace: string): ChaosScenario[] {
  return [
    // Pod Chaos Scenarios
    {
      id: 'random-pod-kill',
      name: 'Random Pod Kill',
      description:
        'Randomly kills one pod every 60 seconds. Tests service resilience and auto-recovery.',
      experiments: [
        {
          id: `${namespace}-random-pod-kill`,
          name: 'Random Pod Kill',
          description: 'Kill a random pod in the namespace',
          type: 'pod-kill',
          category: 'pod',
          namespace,
          duration: '60s',
          action: 'pod-kill',
          mode: 'one',
          selector: {
            namespaces: [namespace],
          },
        },
      ],
    },
    {
      id: 'frontend-pod-failure',
      name: 'Frontend Pod Failure',
      description:
        'Makes frontend pods fail for 30 seconds. Tests frontend availability and load balancing.',
      experiments: [
        {
          id: `${namespace}-frontend-pod-failure`,
          name: 'Frontend Pod Failure',
          description: 'Simulate frontend pod failure',
          type: 'pod-failure',
          category: 'pod',
          namespace,
          duration: '30s',
          action: 'pod-failure',
          mode: 'all',
          selector: {
            labelSelectors: { app: 'frontend' },
            namespaces: [namespace],
          },
        },
      ],
    },

    // Network Chaos Scenarios
    {
      id: 'network-latency',
      name: 'Network Latency (200ms)',
      description:
        'Adds 200ms latency to all network traffic. Tests timeout handling and user experience.',
      experiments: [
        {
          id: `${namespace}-network-latency`,
          name: 'Network Latency',
          description: 'Add 200ms network latency',
          type: 'network-delay',
          category: 'network',
          namespace,
          duration: '120s',
          action: 'delay',
          mode: 'all',
          delay: {
            latency: '200ms',
            correlation: '25',
            jitter: '50ms',
          },
          selector: {
            namespaces: [namespace],
          },
        },
      ],
    },
    {
      id: 'network-partition',
      name: 'Database Network Partition',
      description:
        'Partitions database pods from application pods. Tests database failover and connection handling.',
      experiments: [
        {
          id: `${namespace}-db-partition`,
          name: 'Database Partition',
          description: 'Network partition between app and database',
          type: 'network-partition',
          category: 'network',
          namespace,
          duration: '60s',
          action: 'partition',
          mode: 'all',
          direction: 'both',
          selector: {
            labelSelectors: { tier: 'database' },
            namespaces: [namespace],
          },
          target: {
            mode: 'all',
            selector: {
              labelSelectors: { tier: 'backend' },
              namespaces: [namespace],
            },
          },
        },
      ],
    },
    {
      id: 'packet-loss',
      name: 'Packet Loss (30%)',
      description:
        'Causes 30% packet loss on network traffic. Tests retry logic and error handling.',
      experiments: [
        {
          id: `${namespace}-packet-loss`,
          name: 'Packet Loss',
          description: '30% packet loss',
          type: 'network-loss',
          category: 'network',
          namespace,
          duration: '90s',
          action: 'loss',
          mode: 'all',
          loss: {
            loss: '30',
            correlation: '25',
          },
          selector: {
            namespaces: [namespace],
          },
        },
      ],
    },

    // Stress Chaos Scenarios
    {
      id: 'cpu-stress',
      name: 'CPU Stress (80% load)',
      description: 'Adds CPU stress to all pods. Tests performance under resource pressure.',
      experiments: [
        {
          id: `${namespace}-cpu-stress`,
          name: 'CPU Stress',
          description: '80% CPU load',
          type: 'cpu-stress',
          category: 'stress',
          namespace,
          duration: '120s',
          mode: 'all',
          stressors: {
            cpu: {
              workers: 2,
              load: 80,
            },
          },
          selector: {
            namespaces: [namespace],
          },
        },
      ],
    },
    {
      id: 'memory-stress',
      name: 'Memory Stress (256Mi)',
      description: 'Adds memory pressure to backend pods. Tests OOM handling and resource limits.',
      experiments: [
        {
          id: `${namespace}-memory-stress`,
          name: 'Memory Stress',
          description: 'Memory pressure on backend',
          type: 'memory-stress',
          category: 'stress',
          namespace,
          duration: '90s',
          mode: 'all',
          stressors: {
            memory: {
              workers: 1,
              size: '256Mi',
            },
          },
          selector: {
            labelSelectors: { tier: 'backend' },
            namespaces: [namespace],
          },
        },
      ],
    },

    // IO Chaos Scenarios
    {
      id: 'io-latency',
      name: 'Disk I/O Latency (100ms)',
      description:
        'Adds 100ms latency to disk operations. Tests database performance under slow I/O.',
      experiments: [
        {
          id: `${namespace}-io-latency`,
          name: 'IO Latency',
          description: '100ms disk latency',
          type: 'io-latency',
          category: 'io',
          namespace,
          duration: '60s',
          action: 'latency',
          mode: 'all',
          volumePath: '/var/lib',
          delay: '100ms',
          percent: 50,
          methods: ['read', 'write'],
          selector: {
            labelSelectors: { tier: 'database' },
            namespaces: [namespace],
          },
        },
      ],
    },

    // HTTP Chaos Scenarios
    {
      id: 'http-abort',
      name: 'HTTP Request Abort (50%)',
      description: 'Aborts 50% of HTTP requests to frontend. Tests client-side error handling.',
      experiments: [
        {
          id: `${namespace}-http-abort`,
          name: 'HTTP Abort',
          description: 'Abort 50% of HTTP requests',
          type: 'http-abort',
          category: 'http',
          namespace,
          duration: '60s',
          mode: 'all',
          value: '50',
          target: 'Request',
          port: 80,
          abort: true,
          selector: {
            labelSelectors: { app: 'frontend' },
            namespaces: [namespace],
          },
        },
      ],
    },
    {
      id: 'http-delay',
      name: 'HTTP Response Delay (500ms)',
      description:
        'Delays HTTP responses by 500ms. Tests client timeout handling and UX under latency.',
      experiments: [
        {
          id: `${namespace}-http-delay`,
          name: 'HTTP Delay',
          description: '500ms HTTP response delay',
          type: 'http-delay',
          category: 'http',
          namespace,
          duration: '90s',
          mode: 'all',
          target: 'Response',
          port: 80,
          delay: '500ms',
          selector: {
            labelSelectors: { app: 'frontend' },
            namespaces: [namespace],
          },
        },
      ],
    },

    // Combined Scenarios
    {
      id: 'cascading-failure',
      name: 'Cascading Failure',
      description:
        'Combines pod failure, network latency, and CPU stress to simulate a cascading outage.',
      experiments: [
        {
          id: `${namespace}-cascade-pod-kill`,
          name: 'Cascade Pod Kill',
          description: 'Kill database pod',
          type: 'pod-kill',
          category: 'pod',
          namespace,
          duration: '30s',
          action: 'pod-kill',
          mode: 'one',
          selector: {
            labelSelectors: { tier: 'database' },
            namespaces: [namespace],
          },
        },
        {
          id: `${namespace}-cascade-latency`,
          name: 'Cascade Latency',
          description: 'Add network latency',
          type: 'network-delay',
          category: 'network',
          namespace,
          duration: '120s',
          action: 'delay',
          mode: 'all',
          delay: {
            latency: '100ms',
          },
          selector: {
            namespaces: [namespace],
          },
        },
        {
          id: `${namespace}-cascade-cpu`,
          name: 'Cascade CPU',
          description: 'Add CPU stress',
          type: 'cpu-stress',
          category: 'stress',
          namespace,
          duration: '90s',
          mode: 'fixed-percent',
          value: '50',
          stressors: {
            cpu: {
              workers: 1,
              load: 50,
            },
          },
          selector: {
            namespaces: [namespace],
          },
        },
      ],
    },
    {
      id: 'gradual-degradation',
      name: 'Gradual Degradation',
      description:
        'Simulates gradual system degradation with increasing packet loss and memory pressure.',
      experiments: [
        {
          id: `${namespace}-gradual-loss`,
          name: 'Gradual Packet Loss',
          description: '10% packet loss',
          type: 'network-loss',
          category: 'network',
          namespace,
          duration: '180s',
          action: 'loss',
          mode: 'all',
          loss: {
            loss: '10',
          },
          selector: {
            namespaces: [namespace],
          },
        },
        {
          id: `${namespace}-gradual-memory`,
          name: 'Gradual Memory Pressure',
          description: 'Slow memory increase',
          type: 'memory-stress',
          category: 'stress',
          namespace,
          duration: '180s',
          mode: 'fixed-percent',
          value: '30',
          stressors: {
            memory: {
              workers: 1,
              size: '128Mi',
            },
          },
          selector: {
            namespaces: [namespace],
          },
        },
      ],
    },
  ];
}

/**
 * Get a chaos scenario by ID
 */
export function getChaosScenarioById(
  namespace: string,
  scenarioId: string
): ChaosScenario | undefined {
  const scenarios = createChaosScenarios(namespace);
  return scenarios.find((s) => s.id === scenarioId);
}

/**
 * List all available chaos scenario IDs
 */
export function listChaosScenarioIds(): string[] {
  const scenarios = createChaosScenarios('default');
  return scenarios.map((s) => s.id);
}

/**
 * Get chaos scenarios by category
 */
export function getChaosScenariosByCategory(
  namespace: string,
  category: ChaosCategory
): ChaosScenario[] {
  const scenarios = createChaosScenarios(namespace);
  return scenarios.filter((s) => s.experiments.some((e) => e.category === category));
}
