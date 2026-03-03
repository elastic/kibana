/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InfraLogType } from '../constants';
import type { InfraPool, RuntimeMessagePool, TechPool } from '../types';

type KubeConditions = Exclude<InfraLogType['kubernetes'], 'healthy'>;
type AppKubelet = Record<'k8s_oom' | 'k8s_crash_loop_back', RuntimeMessagePool>;

export const KUBERNETES: Record<string, TechPool<InfraPool<KubeConditions>, AppKubelet>> = {
  kubelet: {
    infra: {
      healthy: [
        `{timestamp} kubelet[1]: I volume_manager.go:154] All volumes are attached and mounted for pod "{namespace}/{pod_name}"`,
        `{timestamp} kubelet[1]: I status_manager.go:530] Syncing pod status with apiserver pod="{namespace}/{pod_name}"`,
      ],
      oom: {
        warn: [
          `{timestamp} kubelet[1]: W eviction_manager.go:559] eviction threshold has been met: signal=memory.available, available=45Mi, threshold=100Mi`,
          `{timestamp} kubelet[1]: W oom_watcher.go:101] memory working_set growing rapidly for pod "{namespace}/{pod_name}": current=312Mi limit=400Mi rate=+18Mi/min`,
        ],
        error: [
          `{timestamp} kubelet[1]: E oom_handler.go:64] OOMKilling container "{container_name}" in pod "{namespace}/{pod_name}" on node {node_name}: memory limit exceeded`,
        ],
      },
      crash_loop_back: {
        warn: [
          `{timestamp} kubelet[1]: W pod_workers.go:965] Warning: container "{container_name}" in pod "{namespace}/{pod_name}" terminated, backoff delay 10s`,
          `{timestamp} kubelet[1]: W status_manager.go:789] container "{container_name}" in pod "{namespace}/{pod_name}" is not running, status=Error`,
          `{timestamp} kubelet[1]: I pod_workers.go:1281] Started container "{container_name}" in pod "{namespace}/{pod_name}"`,
        ],
        error: [
          `{timestamp} kubelet[1]: E pod_workers.go:965] Error syncing pod "{namespace}/{pod_name}": back-off restarting failed container "{container_name}" exit_code=137`,
        ],
      },
    },
    app: {
      k8s_oom: {
        go: {
          warn: [
            `level=warn msg="memory usage approaching container limit" used_mb=460 limit_mb=512`,
          ],
          error: [
            `level=error msg="runtime: out of memory: cannot allocate" bytes=536870912 goroutines=312`,
          ],
        },
        node: {
          warn: [
            `{"level":"warn","msg":"heap approaching container limit","usedMb":460,"limitMb":512}`,
          ],
          error: [
            `{"level":"error","msg":"FATAL ERROR: Reached heap limit Allocation failed","heapUsedMb":510,"limitMb":512}`,
          ],
        },
        python: {
          warn: [`WARNING  app.worker  memory usage approaching limit used_mb=480 limit_mb=512`],
          error: [
            `ERROR    app.worker  MemoryError: unable to allocate memory for request processing`,
          ],
        },
        java: {
          warn: [
            `[{thread}] WARN  {app_pkg}.Worker - heap at 92% of container limit used_mb=472 limit_mb=512`,
          ],
          error: [
            `[{thread}] ERROR {app_pkg}.Worker - java.lang.OutOfMemoryError: Java heap space`,
          ],
        },
      },
      k8s_crash_loop_back: {
        go: {
          warn: [`level=warn msg="liveness probe failing" consecutive=2 path=/healthz`],
          error: [
            `level=error msg="fatal: startup check failed, exiting" err="health endpoint unreachable" code=1`,
          ],
        },
        node: {
          warn: [
            `{"level":"warn","msg":"liveness probe failing","consecutive":2,"path":"/healthz"}`,
          ],
          error: [
            `{"level":"error","msg":"process exiting: startup health check failed","exitCode":1}`,
          ],
        },
        python: {
          warn: [`WARNING  app  liveness probe returned 500 consecutive=2 path=/healthz`],
          error: [`ERROR    app  SystemExit: startup failed, liveness probe rejected request`],
        },
        java: {
          warn: [
            `[{thread}] WARN  {app_pkg}.HealthCheck - liveness probe consecutive failures=2 path=/healthz`,
          ],
          error: [
            `[{thread}] ERROR {app_pkg}.Application - Application startup failed: health check timeout exceeded`,
          ],
        },
      },
    },
  },
};
