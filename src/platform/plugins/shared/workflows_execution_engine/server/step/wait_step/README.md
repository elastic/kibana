# Wait Step

The `wait` step pauses workflow execution for a specified duration.

## Syntax

```yaml
steps:
  - name: wait-before-retry
    type: wait
    with:
      duration: "5s"
```

## Configuration

- **`type`**: Must be `"wait"`
- **`with.duration`**: Duration string (required)

## Duration Format

Duration must follow the format: `"1w2d3h4m5s6ms"` with units in descending order.

**Supported Units:**
- `w` - weeks
- `d` - days
- `h` - hours
- `m` - minutes
- `s` - seconds
- `ms` - milliseconds

**Examples:**
```yaml
duration: "5s"        # 5 seconds
duration: "1m"        # 1 minute
duration: "2h30m"     # 2 hours 30 minutes
duration: "1w2d3h"    # 1 week, 2 days, 3 hours
duration: "1h39s"     # 1 hour 39 seconds
```

**Invalid formats:**
- `"5ss"`, `"10m5ss"` - Duplicate units
- `"1s1w"`, `"2h1d"` - Wrong order (must be descending)
- `"-1s"`, `"0"` - Zero or negative values
- `"1.5s"`, `"1,000s"` - Decimals or commas

## Execution Modes

### Short Duration (≤5 seconds)

For durations ≤5 seconds, the step waits synchronously using `setTimeout`.

**Behavior:**
- Waits in-memory using `setTimeout`
- Can be aborted via abort controller
- Workflow remains in `RUNNING` state
- Execution continues immediately after wait completes

**Example:**
```yaml
steps:
  - name: short-wait
    type: wait
    with:
      duration: "3s"
```

### Long Duration (>5 seconds)

For durations >5 seconds, the step schedules a resume task via task manager.

**Behavior:**
- Schedules a resume task for future execution
- Workflow enters `WAITING` state
- Step state stores `resumeExecutionTaskId`
- Execution resumes when scheduled task runs

**Entering Long Wait:**
1. Start step execution
2. Schedule resume task for `currentTime + duration`
3. Store `resumeExecutionTaskId` in step state
4. Set workflow to `WAITING` state

**Exiting Long Wait:**
1. Clear step state
2. Finish step execution
3. Navigate to next node

**Example:**
```yaml
steps:
  - name: long-wait
    type: wait
    with:
      duration: "1h"
```

## Abort Behavior

Short duration waits can be aborted via the abort controller. When aborted:
- Wait is cancelled immediately
- Step execution is not finished
- Workflow does not continue to next node
- Error: `"Wait step was aborted"`

Long duration waits cannot be aborted once scheduled.

## Examples

### Simple Wait

```yaml
steps:
  - name: delay
    type: wait
    with:
      duration: "10s"
```

### Wait Before Retry

```yaml
steps:
  - name: api-call
    type: http
    on-failure:
      retry:
        max-attempts: 3
        delay: "5s"
  
  - name: wait-before-next
    type: wait
    with:
      duration: "1m"
```

### Long Wait

```yaml
steps:
  - name: wait-one-day
    type: wait
    with:
      duration: "1d"
```

## Implementation Details

**Threshold:** `SHORT_DURATION_THRESHOLD = 5000ms` (5 seconds)

**Duration Parsing:** [`parse-duration.ts`](../../utils/parse-duration/parse-duration.ts)

**Task Manager:** Long waits use `workflowTaskManager.scheduleResumeTask()` to schedule resume

**State Management:** Long waits store `resumeExecutionTaskId` in step state to track scheduled task
