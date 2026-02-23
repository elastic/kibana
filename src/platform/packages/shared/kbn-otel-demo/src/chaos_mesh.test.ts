/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  generateExperimentYaml,
  createChaosScenarios,
  getChaosScenarioById,
  listChaosScenarioIds,
  getChaosScenariosByCategory,
  type PodChaosExperiment,
  type NetworkChaosExperiment,
  type IOChaosExperiment,
  type StressChaosExperiment,
  type HTTPChaosExperiment,
  type ChaosScenario,
  type ChaosCategory,
} from './chaos_mesh';

describe('chaos_mesh', () => {
  const TEST_NAMESPACE = 'test-namespace';

  describe('createChaosScenarios', () => {
    it('should create scenarios for the given namespace', () => {
      const scenarios = createChaosScenarios(TEST_NAMESPACE);
      expect(Array.isArray(scenarios)).toBe(true);
      expect(scenarios.length).toBeGreaterThan(0);
    });

    it('should include namespace in all experiment configs', () => {
      const scenarios = createChaosScenarios(TEST_NAMESPACE);
      for (const scenario of scenarios) {
        for (const experiment of scenario.experiments) {
          expect(experiment.namespace).toBe(TEST_NAMESPACE);
        }
      }
    });

    it('should create unique experiment ids per namespace', () => {
      const scenarios = createChaosScenarios(TEST_NAMESPACE);
      const allIds: string[] = [];
      for (const scenario of scenarios) {
        for (const experiment of scenario.experiments) {
          expect(experiment.id).toContain(TEST_NAMESPACE);
          allIds.push(experiment.id);
        }
      }
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
    });

    it('should have at least 10 predefined scenarios', () => {
      const scenarios = createChaosScenarios(TEST_NAMESPACE);
      expect(scenarios.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('listChaosScenarioIds', () => {
    it('should return all scenario ids', () => {
      const ids = listChaosScenarioIds();
      expect(Array.isArray(ids)).toBe(true);
      expect(ids.length).toBeGreaterThan(0);
    });

    it('should return unique ids', () => {
      const ids = listChaosScenarioIds();
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should include expected scenario ids', () => {
      const ids = listChaosScenarioIds();
      expect(ids).toContain('random-pod-kill');
      expect(ids).toContain('network-latency');
      expect(ids).toContain('cpu-stress');
    });
  });

  describe('getChaosScenarioById', () => {
    it('should find scenario by id', () => {
      const scenario = getChaosScenarioById(TEST_NAMESPACE, 'random-pod-kill');
      expect(scenario).toBeDefined();
      expect(scenario?.id).toBe('random-pod-kill');
    });

    it('should return undefined for non-existent scenario', () => {
      const scenario = getChaosScenarioById(TEST_NAMESPACE, 'non-existent');
      expect(scenario).toBeUndefined();
    });

    it('should apply namespace to returned scenario', () => {
      const scenario = getChaosScenarioById(TEST_NAMESPACE, 'network-latency');
      expect(scenario).toBeDefined();
      for (const experiment of scenario!.experiments) {
        expect(experiment.namespace).toBe(TEST_NAMESPACE);
      }
    });
  });

  describe('getChaosScenariosByCategory', () => {
    const categories: ChaosCategory[] = ['pod', 'network', 'io', 'stress', 'http'];

    it.each(categories)('should return scenarios for %s category', (category) => {
      const scenarios = getChaosScenariosByCategory(TEST_NAMESPACE, category);
      expect(Array.isArray(scenarios)).toBe(true);
      for (const scenario of scenarios) {
        const hasCategory = scenario.experiments.some((e) => e.category === category);
        expect(hasCategory).toBe(true);
      }
    });
  });

  describe('ChaosScenario validation', () => {
    let scenarios: ChaosScenario[];

    beforeEach(() => {
      scenarios = createChaosScenarios(TEST_NAMESPACE);
    });

    it('should have valid structure for all scenarios', () => {
      for (const scenario of scenarios) {
        expect(typeof scenario.id).toBe('string');
        expect(scenario.id.length).toBeGreaterThan(0);
        expect(typeof scenario.name).toBe('string');
        expect(scenario.name.length).toBeGreaterThan(0);
        expect(typeof scenario.description).toBe('string');
        expect(scenario.description.length).toBeGreaterThan(0);
        expect(Array.isArray(scenario.experiments)).toBe(true);
        expect(scenario.experiments.length).toBeGreaterThan(0);
      }
    });

    it('should have valid experiments in all scenarios', () => {
      for (const scenario of scenarios) {
        for (const experiment of scenario.experiments) {
          expect(typeof experiment.id).toBe('string');
          expect(typeof experiment.name).toBe('string');
          expect(typeof experiment.type).toBe('string');
          expect(typeof experiment.category).toBe('string');
          expect(experiment.namespace).toBe(TEST_NAMESPACE);
          expect(experiment.selector).toBeDefined();
        }
      }
    });
  });

  describe('generateExperimentYaml', () => {
    describe('PodChaos', () => {
      const podKillExperiment: PodChaosExperiment = {
        id: 'test-pod-kill',
        name: 'Test Pod Kill',
        description: 'Kill a pod for testing',
        type: 'pod-kill',
        category: 'pod',
        namespace: TEST_NAMESPACE,
        duration: '30s',
        action: 'pod-kill',
        mode: 'one',
        selector: {
          labelSelectors: { app: 'frontend' },
          namespaces: [TEST_NAMESPACE],
        },
      };

      it('should generate valid PodChaos YAML', () => {
        const yaml = generateExperimentYaml(podKillExperiment);

        expect(yaml).toContain('apiVersion: chaos-mesh.org/v1alpha1');
        expect(yaml).toContain('kind: PodChaos');
        expect(yaml).toContain('name: test-pod-kill');
        expect(yaml).toContain(`namespace: ${TEST_NAMESPACE}`);
        expect(yaml).toContain('action: pod-kill');
        expect(yaml).toContain('mode: one');
        expect(yaml).toContain('duration: "30s"');
        expect(yaml).toContain('app: "frontend"');
      });

      it('should include containerNames when provided', () => {
        const experimentWithContainer: PodChaosExperiment = {
          ...podKillExperiment,
          containerNames: ['app-container'],
        };
        const yaml = generateExperimentYaml(experimentWithContainer);
        expect(yaml).toContain('containerNames:');
        expect(yaml).toContain('- app-container');
      });

      it('should include gracePeriod when provided', () => {
        const experimentWithGrace: PodChaosExperiment = {
          ...podKillExperiment,
          gracePeriod: 10,
        };
        const yaml = generateExperimentYaml(experimentWithGrace);
        expect(yaml).toContain('gracePeriod: 10');
      });
    });

    describe('NetworkChaos', () => {
      const networkDelayExperiment: NetworkChaosExperiment = {
        id: 'test-network-delay',
        name: 'Test Network Delay',
        description: 'Add network delay',
        type: 'network-delay',
        category: 'network',
        namespace: TEST_NAMESPACE,
        duration: '60s',
        action: 'delay',
        mode: 'all',
        delay: {
          latency: '100ms',
          correlation: '50',
          jitter: '20ms',
        },
        selector: {
          namespaces: [TEST_NAMESPACE],
        },
      };

      it('should generate valid NetworkChaos YAML for delay', () => {
        const yaml = generateExperimentYaml(networkDelayExperiment);

        expect(yaml).toContain('apiVersion: chaos-mesh.org/v1alpha1');
        expect(yaml).toContain('kind: NetworkChaos');
        expect(yaml).toContain('name: test-network-delay');
        expect(yaml).toContain('action: delay');
        expect(yaml).toContain('latency: "100ms"');
        expect(yaml).toContain('correlation: "50"');
        expect(yaml).toContain('jitter: "20ms"');
      });

      const networkLossExperiment: NetworkChaosExperiment = {
        id: 'test-network-loss',
        name: 'Test Network Loss',
        description: 'Add packet loss',
        type: 'network-loss',
        category: 'network',
        namespace: TEST_NAMESPACE,
        duration: '60s',
        action: 'loss',
        mode: 'all',
        loss: {
          loss: '30',
          correlation: '25',
        },
        selector: {
          namespaces: [TEST_NAMESPACE],
        },
      };

      it('should generate valid NetworkChaos YAML for loss', () => {
        const yaml = generateExperimentYaml(networkLossExperiment);

        expect(yaml).toContain('kind: NetworkChaos');
        expect(yaml).toContain('action: loss');
        expect(yaml).toContain('loss: "30"');
        expect(yaml).toContain('correlation: "25"');
      });

      it('should include direction when provided', () => {
        const experimentWithDirection: NetworkChaosExperiment = {
          ...networkDelayExperiment,
          direction: 'both',
        };
        const yaml = generateExperimentYaml(experimentWithDirection);
        expect(yaml).toContain('direction: both');
      });

      it('should include target when provided', () => {
        const experimentWithTarget: NetworkChaosExperiment = {
          ...networkDelayExperiment,
          target: {
            mode: 'all',
            selector: {
              labelSelectors: { tier: 'backend' },
              namespaces: [TEST_NAMESPACE],
            },
          },
        };
        const yaml = generateExperimentYaml(experimentWithTarget);
        expect(yaml).toContain('target:');
        expect(yaml).toContain('tier: "backend"');
      });
    });

    describe('IOChaos', () => {
      const ioLatencyExperiment: IOChaosExperiment = {
        id: 'test-io-latency',
        name: 'Test IO Latency',
        description: 'Add disk latency',
        type: 'io-latency',
        category: 'io',
        namespace: TEST_NAMESPACE,
        duration: '60s',
        action: 'latency',
        mode: 'all',
        volumePath: '/var/lib/data',
        delay: '50ms',
        percent: 100,
        methods: ['read', 'write'],
        selector: {
          labelSelectors: { tier: 'database' },
          namespaces: [TEST_NAMESPACE],
        },
      };

      it('should generate valid IOChaos YAML', () => {
        const yaml = generateExperimentYaml(ioLatencyExperiment);

        expect(yaml).toContain('apiVersion: chaos-mesh.org/v1alpha1');
        expect(yaml).toContain('kind: IOChaos');
        expect(yaml).toContain('name: test-io-latency');
        expect(yaml).toContain('action: latency');
        expect(yaml).toContain('volumePath: "/var/lib/data"');
        expect(yaml).toContain('delay: "50ms"');
        expect(yaml).toContain('percent: 100');
        expect(yaml).toContain('methods:');
        expect(yaml).toContain('- read');
        expect(yaml).toContain('- write');
      });

      it('should include path when provided', () => {
        const experimentWithPath: IOChaosExperiment = {
          ...ioLatencyExperiment,
          path: '/var/lib/data/*.log',
        };
        const yaml = generateExperimentYaml(experimentWithPath);
        expect(yaml).toContain('path: "/var/lib/data/*.log"');
      });

      it('should include errno when provided', () => {
        const faultExperiment: IOChaosExperiment = {
          ...ioLatencyExperiment,
          action: 'errno',
          errno: 5,
        };
        const yaml = generateExperimentYaml(faultExperiment);
        expect(yaml).toContain('action: errno');
        expect(yaml).toContain('errno: 5');
      });
    });

    describe('StressChaos', () => {
      const cpuStressExperiment: StressChaosExperiment = {
        id: 'test-cpu-stress',
        name: 'Test CPU Stress',
        description: 'CPU stress test',
        type: 'cpu-stress',
        category: 'stress',
        namespace: TEST_NAMESPACE,
        duration: '120s',
        mode: 'all',
        stressors: {
          cpu: {
            workers: 2,
            load: 80,
          },
        },
        selector: {
          namespaces: [TEST_NAMESPACE],
        },
      };

      it('should generate valid StressChaos YAML for CPU stress', () => {
        const yaml = generateExperimentYaml(cpuStressExperiment);

        expect(yaml).toContain('apiVersion: chaos-mesh.org/v1alpha1');
        expect(yaml).toContain('kind: StressChaos');
        expect(yaml).toContain('name: test-cpu-stress');
        expect(yaml).toContain('mode: all');
        expect(yaml).toContain('stressors:');
        expect(yaml).toContain('cpu:');
        expect(yaml).toContain('workers: 2');
        expect(yaml).toContain('load: 80');
      });

      const memoryStressExperiment: StressChaosExperiment = {
        id: 'test-memory-stress',
        name: 'Test Memory Stress',
        description: 'Memory stress test',
        type: 'memory-stress',
        category: 'stress',
        namespace: TEST_NAMESPACE,
        duration: '90s',
        mode: 'fixed-percent',
        value: '50',
        stressors: {
          memory: {
            workers: 1,
            size: '256Mi',
          },
        },
        selector: {
          labelSelectors: { tier: 'backend' },
          namespaces: [TEST_NAMESPACE],
        },
      };

      it('should generate valid StressChaos YAML for memory stress', () => {
        const yaml = generateExperimentYaml(memoryStressExperiment);

        expect(yaml).toContain('kind: StressChaos');
        expect(yaml).toContain('mode: fixed-percent');
        expect(yaml).toContain('value: "50"');
        expect(yaml).toContain('memory:');
        expect(yaml).toContain('workers: 1');
        expect(yaml).toContain('size: "256Mi"');
      });

      it('should include containerNames when provided', () => {
        const experimentWithContainer: StressChaosExperiment = {
          ...cpuStressExperiment,
          containerNames: ['app'],
        };
        const yaml = generateExperimentYaml(experimentWithContainer);
        expect(yaml).toContain('containerNames:');
        expect(yaml).toContain('- app');
      });
    });

    describe('HTTPChaos', () => {
      const httpAbortExperiment: HTTPChaosExperiment = {
        id: 'test-http-abort',
        name: 'Test HTTP Abort',
        description: 'Abort HTTP requests',
        type: 'http-abort',
        category: 'http',
        namespace: TEST_NAMESPACE,
        duration: '60s',
        mode: 'all',
        value: '50',
        target: 'Request',
        port: 8080,
        abort: true,
        selector: {
          labelSelectors: { app: 'frontend' },
          namespaces: [TEST_NAMESPACE],
        },
      };

      it('should generate valid HTTPChaos YAML for abort', () => {
        const yaml = generateExperimentYaml(httpAbortExperiment);

        expect(yaml).toContain('apiVersion: chaos-mesh.org/v1alpha1');
        expect(yaml).toContain('kind: HTTPChaos');
        expect(yaml).toContain('name: test-http-abort');
        expect(yaml).toContain('target: Request');
        expect(yaml).toContain('port: 8080');
        expect(yaml).toContain('abort: true');
        expect(yaml).toContain('value: "50"');
      });

      const httpDelayExperiment: HTTPChaosExperiment = {
        id: 'test-http-delay',
        name: 'Test HTTP Delay',
        description: 'Delay HTTP responses',
        type: 'http-delay',
        category: 'http',
        namespace: TEST_NAMESPACE,
        duration: '90s',
        mode: 'all',
        target: 'Response',
        port: 80,
        path: '/api/*',
        method: 'GET',
        delay: '500ms',
        selector: {
          labelSelectors: { app: 'frontend' },
          namespaces: [TEST_NAMESPACE],
        },
      };

      it('should generate valid HTTPChaos YAML for delay', () => {
        const yaml = generateExperimentYaml(httpDelayExperiment);

        expect(yaml).toContain('kind: HTTPChaos');
        expect(yaml).toContain('target: Response');
        expect(yaml).toContain('port: 80');
        expect(yaml).toContain('path: "/api/*"');
        expect(yaml).toContain('method: GET');
        expect(yaml).toContain('delay: "500ms"');
      });
    });

    describe('error handling', () => {
      it('should throw for unknown experiment category', () => {
        const invalidExperiment = {
          id: 'test',
          name: 'Test',
          description: 'Test',
          type: 'unknown',
          category: 'unknown' as ChaosCategory,
          namespace: TEST_NAMESPACE,
          selector: {},
        };

        expect(() => generateExperimentYaml(invalidExperiment as any)).toThrow(
          'Unknown chaos experiment category'
        );
      });
    });
  });

  describe('predefined scenarios', () => {
    const scenarios = createChaosScenarios(TEST_NAMESPACE);

    describe('pod chaos scenarios', () => {
      it('should have random-pod-kill scenario', () => {
        const scenario = scenarios.find((s) => s.id === 'random-pod-kill');
        expect(scenario).toBeDefined();
        expect(scenario?.experiments[0].type).toBe('pod-kill');
        expect(scenario?.experiments[0].mode).toBe('one');
      });

      it('should have frontend-pod-failure scenario', () => {
        const scenario = scenarios.find((s) => s.id === 'frontend-pod-failure');
        expect(scenario).toBeDefined();
        expect(scenario?.experiments[0].type).toBe('pod-failure');
        expect(scenario?.experiments[0].selector.labelSelectors?.app).toBe('frontend');
      });
    });

    describe('network chaos scenarios', () => {
      it('should have network-latency scenario with 200ms delay', () => {
        const scenario = scenarios.find((s) => s.id === 'network-latency');
        expect(scenario).toBeDefined();
        const experiment = scenario?.experiments[0] as NetworkChaosExperiment;
        expect(experiment.type).toBe('network-delay');
        expect(experiment.delay?.latency).toBe('200ms');
      });

      it('should have packet-loss scenario with 30% loss', () => {
        const scenario = scenarios.find((s) => s.id === 'packet-loss');
        expect(scenario).toBeDefined();
        const experiment = scenario?.experiments[0] as NetworkChaosExperiment;
        expect(experiment.type).toBe('network-loss');
        expect(experiment.loss?.loss).toBe('30');
      });

      it('should have network-partition scenario', () => {
        const scenario = scenarios.find((s) => s.id === 'network-partition');
        expect(scenario).toBeDefined();
        expect(scenario?.experiments[0].type).toBe('network-partition');
      });
    });

    describe('stress chaos scenarios', () => {
      it('should have cpu-stress scenario with 80% load', () => {
        const scenario = scenarios.find((s) => s.id === 'cpu-stress');
        expect(scenario).toBeDefined();
        const experiment = scenario?.experiments[0] as StressChaosExperiment;
        expect(experiment.type).toBe('cpu-stress');
        expect(experiment.stressors.cpu?.load).toBe(80);
      });

      it('should have memory-stress scenario with 256Mi', () => {
        const scenario = scenarios.find((s) => s.id === 'memory-stress');
        expect(scenario).toBeDefined();
        const experiment = scenario?.experiments[0] as StressChaosExperiment;
        expect(experiment.type).toBe('memory-stress');
        expect(experiment.stressors.memory?.size).toBe('256Mi');
      });
    });

    describe('io chaos scenarios', () => {
      it('should have io-latency scenario with 100ms delay', () => {
        const scenario = scenarios.find((s) => s.id === 'io-latency');
        expect(scenario).toBeDefined();
        const experiment = scenario?.experiments[0] as IOChaosExperiment;
        expect(experiment.type).toBe('io-latency');
        expect(experiment.delay).toBe('100ms');
      });
    });

    describe('http chaos scenarios', () => {
      it('should have http-abort scenario with 50% abort rate', () => {
        const scenario = scenarios.find((s) => s.id === 'http-abort');
        expect(scenario).toBeDefined();
        const experiment = scenario?.experiments[0] as HTTPChaosExperiment;
        expect(experiment.type).toBe('http-abort');
        expect(experiment.abort).toBe(true);
        expect(experiment.value).toBe('50');
      });

      it('should have http-delay scenario with 500ms delay', () => {
        const scenario = scenarios.find((s) => s.id === 'http-delay');
        expect(scenario).toBeDefined();
        const experiment = scenario?.experiments[0] as HTTPChaosExperiment;
        expect(experiment.type).toBe('http-delay');
        expect(experiment.delay).toBe('500ms');
      });
    });

    describe('combined scenarios', () => {
      it('should have cascading-failure scenario with multiple experiments', () => {
        const scenario = scenarios.find((s) => s.id === 'cascading-failure');
        expect(scenario).toBeDefined();
        expect(scenario?.experiments.length).toBeGreaterThanOrEqual(3);
      });

      it('should have gradual-degradation scenario', () => {
        const scenario = scenarios.find((s) => s.id === 'gradual-degradation');
        expect(scenario).toBeDefined();
        expect(scenario?.experiments.length).toBeGreaterThanOrEqual(2);
      });
    });
  });
});
