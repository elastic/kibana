/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InfraLogType } from '../../constants';

export const KUBERNETES: Record<string, Record<InfraLogType['kubernetes'], string[]>> = {
  kubelet: {
    healthy: [
      `{timestamp} kubelet[1]: I volume_manager.go:154] All volumes are attached and mounted for pod "{namespace}/{pod_name}"`,
      `{timestamp} kubelet[1]: I status_manager.go:530] Syncing pod status with apiserver pod="{namespace}/{pod_name}"`,
    ],
    scheduling: [
      `{timestamp} kubelet[1]: W eviction_manager.go:559] eviction threshold has been met: signal=memory.available, available=45Mi, threshold=100Mi`,
      `{timestamp} kubelet[1]: W eviction_manager.go:407] Evicting pod "{namespace}/{pod_name}" to reclaim memory on node {node_name}`,
      `{timestamp} kubelet[1]: W oom_watcher.go:101] memory working_set growing rapidly for pod "{namespace}/{pod_name}": current=312Mi limit=400Mi rate=+18Mi/min`,
      `{timestamp} kubelet[1]: W eviction_manager.go:559] eviction threshold has been met: signal=memory.available, available=22Mi, threshold=100Mi pod="{namespace}/{pod_name}"`,
    ],
    oom: [
      `{timestamp} kubelet[1]: E oom_handler.go:64] OOMKilling container "{container_name}" in pod "{namespace}/{pod_name}" on node {node_name}: memory limit exceeded`,
    ],
    crash_loop_back: [
      `{timestamp} kubelet[1]: E pod_workers.go:965] Error syncing pod "{namespace}/{pod_name}": back-off restarting failed container "{container_name}" exit_code=137`,
      `{timestamp} kubelet[1]: I pod_workers.go:1281] Started container "{container_name}" in pod "{namespace}/{pod_name}"`,
    ],
  },
};
