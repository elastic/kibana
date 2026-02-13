# Kibana Task Manager: Resource Limits Analysis

**Date**: February 11, 2026  
**Author**: Analysis of Task Manager capabilities for resource limiting

## Executive Summary

The Kibana Task Manager currently **does NOT support direct memory consumption limits** or other granular resource limits (CPU, I/O) per individual task. However, it has several related mechanisms that indirectly manage resources. This document analyzes current capabilities and proposes implementation strategies for adding resource limits.

---

## Current State: What Task Manager CAN Do

### 1. **Capacity-Based Limits** ✅
- **Location**: `x-pack/platform/plugins/shared/task_manager/server/config.ts`
- **Mechanism**: Global capacity pool with cost-based task scheduling
- **Configuration**:
  - `capacity`: Maximum concurrent capacity (default: 10-50 based on heap size)
  - `max_workers`: Deprecated, being replaced by capacity
  - Task definitions can specify `cost` (Tiny=1, Normal=2, ExtraLarge=10)

```typescript
// Task definition with cost
{
  type: 'expensive-task',
  cost: TaskCost.ExtraLarge, // Takes 10 units of capacity
  // ...
}
```

**How it works**: 
- Each Kibana instance has a total capacity pool
- Tasks consume capacity based on their cost
- System won't run tasks if capacity is exceeded
- **Indirectly limits resource usage** by limiting concurrency

### 2. **Timeout-Based Limits** ✅
- **Location**: `x-pack/platform/plugins/shared/task_manager/server/task.ts`
- **Mechanism**: Task execution time limits with automatic cancellation
- **Configuration**:
  - Default: 5 minutes per task
  - Configurable per task type via `timeout` field
  - Can be overridden per task instance via `timeoutOverride`

```typescript
// Task definition with timeout
{
  type: 'my-task',
  timeout: '10m', // or '30s', etc.
  createTaskRunner: (context) => ({
    async run() { /* ... */ },
    async cancel() { /* called on timeout */ }
  })
}
```

**How it works**:
- Task expiration calculated on start: `startedAt + timeout`
- Polling lifecycle cancels expired tasks
- `AbortController` signal passed to task runner
- Prevents infinite-running tasks

### 3. **Event Loop Monitoring** ✅
- **Location**: `x-pack/platform/plugins/shared/task_manager/server/task_events.ts`
- **Mechanism**: Monitors event loop delays during task execution
- **Configuration**:
  ```typescript
  event_loop_delay: {
    monitor: true,
    warn_threshold: 5000 // milliseconds
  }
  ```

**How it works**:
- Uses Node.js `monitorEventLoopDelay()` from `perf_hooks`
- Tracks event loop blocking during task execution
- Logs warnings when threshold exceeded
- **Does not prevent execution**, only monitors/warns

### 4. **Heap-Based Capacity Calculation** ⚠️ (Indirect)
- **Location**: `x-pack/platform/plugins/shared/task_manager/server/lib/get_default_capacity.ts`
- **Mechanism**: Auto-calculates default capacity based on heap size
- **Only in**: Elastic Cloud, with MGET claim strategy

```typescript
const HEAP_TO_CAPACITY_MAP = [
  { minHeap: 0, maxHeap: 1, capacity: 10 },
  { minHeap: 1, maxHeap: 2, capacity: 15 },
  { minHeap: 2, maxHeap: 16, capacity: 25 },
  // ...
];
```

**Limitation**: Only sets initial capacity, doesn't monitor runtime memory

### 5. **Max Attempts / Retry Logic** ✅
- **Location**: `x-pack/platform/plugins/shared/task_manager/server/config.ts`
- **Mechanism**: Limits failed task retries
- **Configuration**:
  - `max_attempts`: Default 3 retries
  - Exponential backoff on failures
  - Prevents infinite retry loops

---

## What Task Manager CANNOT Currently Do

### ❌ 1. **Per-Task Memory Limits**
- No mechanism to limit heap memory consumption per task
- No way to kill a task that exceeds memory threshold
- No memory tracking during task execution

### ❌ 2. **CPU Usage Limits**
- No CPU time limits per task
- No CPU throttling
- No detection of CPU-intensive tasks

### ❌ 3. **I/O Limits**
- No disk I/O limits
- No network I/O limits
- No rate limiting on Elasticsearch queries

### ❌ 4. **Resource Quotas**
- No cumulative resource accounting
- No per-tenant/per-space resource limits
- No priority-based resource allocation beyond static task priority

---

## Why Memory Limits Don't Exist Currently

1. **JavaScript/V8 Constraints**: 
   - Memory in Node.js is managed by V8 garbage collector
   - No built-in mechanism to limit memory per "task" or "context"
   - Isolates (separate V8 contexts) are too heavyweight for tasks

2. **Node.js Process Model**:
   - All tasks run in the same Node.js process
   - Shared heap across all tasks
   - Killing one task due to memory would be difficult without affecting others

3. **Architectural Decisions**:
   - Task Manager designed for background jobs, not sandboxed execution
   - Timeout + capacity limits deemed sufficient for most use cases
   - Performance overhead of per-task monitoring considered too high

---

## Proposed Implementation Strategies

### Strategy 1: **Memory Monitoring with Soft Limits** (Recommended)

**Approach**: Monitor heap usage during task execution, cancel tasks exceeding limits

#### Implementation Plan:

```typescript
// 1. Add to task definition
export interface TaskDefinition {
  // ...existing fields...
  memoryLimit?: string; // e.g., '100mb', '1gb'
}

// 2. Add to config
export const configSchema = schema.object({
  // ...existing config...
  memory_monitoring: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
    check_interval: schema.number({ defaultValue: 5000 }), // 5s
    default_limit: schema.string({ defaultValue: '500mb' }),
    global_limit_percentage: schema.number({ 
      defaultValue: 80,
      min: 50,
      max: 95 
    }), // Kill tasks if heap > 80%
  }),
});

// 3. Implement memory monitor in task_runner.ts
class TaskRunner {
  private memoryCheckInterval?: NodeJS.Timeout;
  
  private startMemoryMonitoring() {
    if (!this.config.memory_monitoring.enabled) return;
    
    const limitBytes = parseMemoryString(
      this.definition?.memoryLimit ?? 
      this.config.memory_monitoring.default_limit
    );
    
    const startHeapUsed = process.memoryUsage().heapUsed;
    
    this.memoryCheckInterval = setInterval(() => {
      const currentHeapUsed = process.memoryUsage().heapUsed;
      const taskMemoryUsage = currentHeapUsed - startHeapUsed;
      const heapTotal = process.memoryUsage().heapTotal;
      const heapPercent = (currentHeapUsed / heapTotal) * 100;
      
      // Check per-task limit
      if (taskMemoryUsage > limitBytes) {
        this.logger.warn(
          `Task ${this.id} exceeded memory limit: ` +
          `${formatBytes(taskMemoryUsage)} > ${formatBytes(limitBytes)}`
        );
        this.cancelDueToMemory('task_limit_exceeded');
      }
      
      // Check global heap limit
      const globalLimit = this.config.memory_monitoring.global_limit_percentage;
      if (heapPercent > globalLimit) {
        this.logger.error(
          `Task ${this.id} cancelled due to high global heap usage: ` +
          `${heapPercent.toFixed(1)}% > ${globalLimit}%`
        );
        this.cancelDueToMemory('global_limit_exceeded');
      }
    }, this.config.memory_monitoring.check_interval);
  }
  
  private stopMemoryMonitoring() {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }
  }
  
  private async cancelDueToMemory(reason: string) {
    // Emit metric
    this.onTaskEvent(asTaskManagerStatEvent(
      'memoryLimitExceeded',
      asOk(1)
    ));
    
    // Cancel task
    await this.cancel();
    
    // Mark task with special status
    throw new TaskMemoryLimitError(reason);
  }
  
  public async run() {
    try {
      this.startMemoryMonitoring();
      // ...existing run logic...
    } finally {
      this.stopMemoryMonitoring();
    }
  }
}
```

#### Advantages:
- ✅ Relatively simple to implement
- ✅ No external dependencies
- ✅ Minimal performance overhead (5-second checks)
- ✅ Can distinguish between per-task and global limits
- ✅ Graceful cancellation via existing cancel mechanism

#### Disadvantages:
- ⚠️ Not precise (heap delta is approximate)
- ⚠️ Can't attribute memory to specific task in shared heap
- ⚠️ Memory might spike between checks
- ⚠️ Task might not release memory on cancel

---

### Strategy 2: **Worker Threads Isolation** (Advanced)

**Approach**: Run memory-sensitive tasks in separate worker threads with resource limits

#### Implementation Plan:

```typescript
// 1. Add worker thread support to task definitions
export interface TaskDefinition {
  // ...existing fields...
  runInWorkerThread?: boolean;
  workerResourceLimits?: {
    maxOldGenerationSizeMb?: number;
    maxYoungGenerationSizeMb?: number;
    codeRangeSizeMb?: number;
  };
}

// 2. Create worker thread task executor
import { Worker } from 'worker_threads';

class WorkerThreadTaskExecutor {
  async executeTask(
    taskDefinition: TaskDefinition,
    context: RunContext
  ): Promise<RunResult> {
    const worker = new Worker('./task_worker.js', {
      workerData: {
        taskType: taskDefinition.type,
        taskInstance: context.taskInstance,
      },
      resourceLimits: {
        maxOldGenerationSizeMb: 
          taskDefinition.workerResourceLimits?.maxOldGenerationSizeMb,
        maxYoungGenerationSizeMb: 
          taskDefinition.workerResourceLimits?.maxYoungGenerationSizeMb,
      },
    });
    
    return new Promise((resolve, reject) => {
      worker.on('message', (result) => {
        worker.terminate();
        resolve(result);
      });
      
      worker.on('error', (error) => {
        worker.terminate();
        reject(error);
      });
      
      // Timeout handling
      setTimeout(() => {
        worker.terminate();
        reject(new Error('Worker thread timeout'));
      }, parseTimeout(taskDefinition.timeout));
    });
  }
}

// 3. task_worker.js (worker thread entry point)
const { workerData, parentPort } = require('worker_threads');

async function runTask() {
  // Load task definition
  const taskDef = getTaskDefinition(workerData.taskType);
  
  // Execute task
  const runner = taskDef.createTaskRunner({
    taskInstance: workerData.taskInstance,
  });
  
  const result = await runner.run();
  
  // Send result back
  parentPort.postMessage(result);
}

runTask().catch((error) => {
  parentPort.postMessage({ error });
});
```

#### Advantages:
- ✅ **True memory isolation** via V8 resource limits
- ✅ Can enforce hard limits on old/young generation heap
- ✅ Task crashes don't affect main thread
- ✅ Can run CPU-intensive tasks without blocking event loop

#### Disadvantages:
- ❌ **Major architectural change**
- ❌ Communication overhead (serialization/deserialization)
- ❌ Can't share objects with main thread (structured clone only)
- ❌ Many Kibana APIs not available in worker threads
- ❌ Higher latency per task
- ❌ Complex error handling and state management

---

### Strategy 3: **External Process Execution** (Most Isolated)

**Approach**: Run resource-intensive tasks in separate Node.js processes

#### Implementation Plan:

```typescript
// 1. Add process execution support
export interface TaskDefinition {
  // ...existing fields...
  runInProcess?: boolean;
  processResourceLimits?: {
    maxMemoryMb?: number;
    cpuLimitPercent?: number;
  };
}

// 2. Use child_process with resource limits
import { fork } from 'child_process';

class ProcessTaskExecutor {
  async executeTask(
    taskDefinition: TaskDefinition,
    context: RunContext
  ): Promise<RunResult> {
    const maxMemoryBytes = 
      (taskDefinition.processResourceLimits?.maxMemoryMb ?? 500) * 1024 * 1024;
    
    const child = fork('./task_process.js', [], {
      execArgv: [
        `--max-old-space-size=${Math.floor(maxMemoryBytes / (1024 * 1024))}`,
      ],
    });
    
    // Send task data
    child.send({
      taskType: taskDefinition.type,
      taskInstance: context.taskInstance,
    });
    
    return new Promise((resolve, reject) => {
      let memoryCheckInterval: NodeJS.Timeout;
      
      // Monitor child process memory
      memoryCheckInterval = setInterval(() => {
        // Use process.memoryUsage() or external tools
        // Kill if exceeds limits
      }, 5000);
      
      child.on('message', (result) => {
        clearInterval(memoryCheckInterval);
        child.kill();
        resolve(result);
      });
      
      child.on('error', (error) => {
        clearInterval(memoryCheckInterval);
        child.kill();
        reject(error);
      });
    });
  }
}
```

#### Advantages:
- ✅ **Complete isolation** - separate process space
- ✅ Can use OS-level resource limits (cgroups on Linux)
- ✅ Hard memory limits via V8 `--max-old-space-size`
- ✅ Process crash doesn't affect Kibana

#### Disadvantages:
- ❌ **Highest overhead** - process spawn time
- ❌ Complex IPC (inter-process communication)
- ❌ Serialization limits
- ❌ Can't access Kibana services directly
- ❌ State management complexity

---

### Strategy 4: **Reactive Capacity Adjustment** (Easiest)

**Approach**: Don't limit individual tasks, but reduce capacity when memory pressure detected

#### Implementation Plan:

```typescript
// 1. Add memory-based capacity adjustment
export const configSchema = schema.object({
  // ...existing config...
  adaptive_capacity: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    check_interval: schema.number({ defaultValue: 10000 }), // 10s
    memory_thresholds: schema.object({
      reduce_at_percent: schema.number({ defaultValue: 75 }),
      minimum_capacity: schema.number({ defaultValue: 5 }),
      reduction_factor: schema.number({ defaultValue: 0.5 }), // 50% reduction
    }),
  }),
});

// 2. Implement in polling_lifecycle.ts
class TaskPollingLifecycle {
  private memoryBasedCapacityAdjustment$ = new BehaviorSubject<number>(1.0);
  
  private startMemoryMonitoring() {
    setInterval(() => {
      const { heapUsed, heapTotal } = process.memoryUsage();
      const usagePercent = (heapUsed / heapTotal) * 100;
      const threshold = this.config.adaptive_capacity.memory_thresholds.reduce_at_percent;
      
      if (usagePercent > threshold) {
        const factor = this.config.adaptive_capacity.memory_thresholds.reduction_factor;
        this.logger.warn(
          `High memory usage detected: ${usagePercent.toFixed(1)}%. ` +
          `Reducing capacity by ${(1 - factor) * 100}%`
        );
        this.memoryBasedCapacityAdjustment$.next(factor);
      } else {
        // Restore to normal
        this.memoryBasedCapacityAdjustment$.next(1.0);
      }
    }, this.config.adaptive_capacity.check_interval);
  }
  
  // 3. Apply to capacity calculation
  this.capacityConfiguration$ = combineLatest([
    baseCapacity$,
    this.memoryBasedCapacityAdjustment$,
  ]).pipe(
    map(([baseCapacity, memoryFactor]) => 
      Math.max(
        Math.floor(baseCapacity * memoryFactor),
        this.config.adaptive_capacity.memory_thresholds.minimum_capacity
      )
    )
  );
}
```

#### Advantages:
- ✅ **Easiest to implement** - uses existing capacity mechanism
- ✅ No per-task overhead
- ✅ Protects entire Kibana instance
- ✅ Automatic recovery when memory pressure decreases
- ✅ Works with existing task definitions

#### Disadvantages:
- ⚠️ Not per-task limits - affects all tasks equally
- ⚠️ Reactive, not proactive
- ⚠️ Doesn't identify which tasks are problematic

---

## Recommended Approach

### Phase 1: **Reactive Capacity Adjustment** (Short-term)
- Implement Strategy 4 first
- Quick win with minimal risk
- Protects against OOM scenarios
- Can be shipped quickly

### Phase 2: **Memory Monitoring with Soft Limits** (Medium-term)
- Implement Strategy 1
- Add per-task memory tracking
- Provide opt-in memory limits for known problematic tasks
- Gather metrics to inform future decisions

### Phase 3: **Consider Worker Threads** (Long-term)
- Evaluate Strategy 2 for specific task types
- Start with read-only/stateless tasks
- Gradually expand to more task types
- Only if Phase 2 proves insufficient

---

## Migration Path for Existing Tasks

### For Task Definition Authors:

```typescript
// Before (current)
taskManager.registerTaskDefinitions({
  'my-task': {
    title: 'My Task',
    timeout: '5m',
    createTaskRunner: (context) => ({
      async run() { /* ... */ }
    }),
  },
});

// After Phase 1 (no changes needed - automatic)
// System automatically reduces capacity under memory pressure

// After Phase 2 (opt-in limits)
taskManager.registerTaskDefinitions({
  'my-task': {
    title: 'My Task',
    timeout: '5m',
    memoryLimit: '100mb', // NEW: Optional per-task limit
    createTaskRunner: (context) => ({
      async run() { 
        // Task should be memory-efficient
        // Will be cancelled if exceeds limit
      }
    }),
  },
});

// After Phase 3 (worker threads for specific tasks)
taskManager.registerTaskDefinitions({
  'cpu-intensive-task': {
    title: 'CPU Intensive Task',
    runInWorkerThread: true, // NEW: Run in isolated worker
    workerResourceLimits: {
      maxOldGenerationSizeMb: 512,
    },
    createTaskRunner: (context) => ({
      async run() {
        // This runs in a separate thread with hard memory limits
      }
    }),
  },
});
```

### Configuration Changes:

```yaml
# kibana.yml

# Phase 1: Adaptive capacity (enabled by default)
xpack.task_manager.adaptive_capacity:
  enabled: true
  check_interval: 10000
  memory_thresholds:
    reduce_at_percent: 75
    minimum_capacity: 5
    reduction_factor: 0.5

# Phase 2: Per-task memory monitoring (opt-in)
xpack.task_manager.memory_monitoring:
  enabled: false  # Opt-in initially
  check_interval: 5000
  default_limit: '500mb'
  global_limit_percentage: 80

# Phase 3: Worker threads (opt-in per task type)
# (No global config needed - defined per task)
```

---

## Testing Strategy

### 1. Unit Tests
- Memory monitoring logic
- Capacity adjustment calculations
- Limit parsing and validation

### 2. Integration Tests
- Task cancellation on memory limit
- Capacity reduction under pressure
- Recovery after pressure decreases

### 3. Load Tests
- Multiple concurrent tasks
- Memory-intensive task scenarios
- OOM prevention validation

### 4. Performance Tests
- Overhead of memory monitoring
- Impact on task latency
- Throughput under different memory conditions

---

## Monitoring & Observability

### New Metrics to Add:

```typescript
// 1. Memory-related task metrics
interface TaskMemoryMetrics {
  task_memory_limit_exceeded: number;  // Counter
  task_memory_usage_bytes: number;     // Gauge per task
  global_heap_usage_percent: number;   // Gauge
  capacity_reduction_events: number;   // Counter
  memory_pressure_duration_ms: number; // Histogram
}

// 2. Expose via existing metrics endpoints
GET /api/task_manager/metrics
{
  "memory": {
    "heap_used_mb": 450,
    "heap_total_mb": 1024,
    "heap_usage_percent": 43.9,
    "tasks_cancelled_for_memory": 3,
    "capacity_reduction_active": true,
    "current_capacity_multiplier": 0.5
  }
}

// 3. Add to health endpoint
GET /api/task_manager/health
{
  "status": "warning",
  "memory": {
    "status": "warning",
    "pressure": "high",
    "heap_usage_percent": 82.5,
    "message": "Capacity reduced due to memory pressure"
  }
}
```

---

## Security & Safety Considerations

1. **Denial of Service Prevention**:
   - Memory limits prevent single task from exhausting heap
   - Capacity reduction prevents complete OOM

2. **Task Priority Preservation**:
   - High-priority tasks should be preserved during capacity reduction
   - Consider priority-based eviction strategy

3. **Graceful Degradation**:
   - System should remain functional even with reduced capacity
   - Critical tasks (health checks, monitoring) should continue

4. **Audit Logging**:
   - Log all memory-based cancellations
   - Track which tasks cause memory pressure
   - Enable analysis and optimization

---

## Open Questions for Discussion

1. **Should memory limits be hard or soft?**
   - Hard: Kill task immediately on violation
   - Soft: Warning + graceful cancellation

2. **How to handle recurring tasks that exceed limits?**
   - Disable after N consecutive violations?
   - Exponential backoff?
   - Admin notification?

3. **Should we expose memory usage to task runners?**
   - Allow tasks to self-monitor and optimize
   - Provide memory usage in task context

4. **Interaction with existing timeouts:**
   - Should memory limit share the same cancellation mechanism?
   - Or separate error types?

5. **Cloud vs on-prem differences:**
   - More aggressive limits in Cloud?
   - Different defaults for containerized environments?

---

## References

### Existing Code Locations:
- **Config**: `x-pack/platform/plugins/shared/task_manager/server/config.ts`
- **Task Runner**: `x-pack/platform/plugins/shared/task_manager/server/task_running/task_runner.ts`
- **Task Pool**: `x-pack/platform/plugins/shared/task_manager/server/task_pool/task_pool.ts`
- **Capacity Calculation**: `x-pack/platform/plugins/shared/task_manager/server/lib/get_default_capacity.ts`
- **Event Loop Monitoring**: `x-pack/platform/plugins/shared/task_manager/server/task_events.ts`

### Related Documentation:
- [Task Manager README](x-pack/platform/plugins/shared/task_manager/README.md)
- [Task Manager Monitoring](x-pack/platform/plugins/shared/task_manager/MONITORING.MD)
- [Node.js Worker Threads](https://nodejs.org/api/worker_threads.html)
- [V8 Heap Statistics](https://nodejs.org/api/v8.html)

---

## Conclusion

**Current State**: Kibana Task Manager has NO direct memory limits, but has timeout, capacity, and event loop monitoring.

**Recommended Path Forward**:
1. **Immediate**: Implement reactive capacity adjustment (Strategy 4)
2. **Short-term**: Add memory monitoring with soft limits (Strategy 1)  
3. **Long-term**: Evaluate worker threads for specific high-risk tasks (Strategy 2)

This phased approach balances quick wins with long-term architectural improvements while minimizing risk to the existing system.
