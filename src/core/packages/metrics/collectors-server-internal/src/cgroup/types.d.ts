import type { OpsOsMetrics } from '@kbn/core-metrics-server';
export type OsCgroupMetrics = Pick<OpsOsMetrics, 'cpu' | 'cpuacct' | 'cgroup_memory'>;
