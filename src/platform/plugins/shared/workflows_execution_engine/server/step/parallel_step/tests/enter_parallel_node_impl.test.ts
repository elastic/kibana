/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DEFAULT_PARALLEL_MAX_CONCURRENCY,
  DEFAULT_PARALLEL_MAX_FAN_OUT,
  ExecutionStatus,
} from '@kbn/workflows';
import type { EnterParallelNode, WorkflowGraph } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { StepExecutionRuntimeFactory } from '../../../workflow_context_manager/step_execution_runtime_factory';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger';
import type { NodeImplementation } from '../../node_implementation';
import type { NodesFactory } from '../../nodes_factory';
import { EnterParallelNodeImpl } from '../enter_parallel_node_impl';
import type { ParallelStepState } from '../types';

describe('EnterParallelNodeImpl', () => {
  let node: EnterParallelNode;
  let workflowRuntime: jest.Mocked<WorkflowExecutionRuntimeManager>;
  let stepRuntime: jest.Mocked<StepExecutionRuntime>;
  let logger: jest.Mocked<IWorkflowEventLogger>;
  let factory: jest.Mocked<StepExecutionRuntimeFactory>;
  let nodesFactory: jest.Mocked<NodesFactory>;
  let workflowGraph: jest.Mocked<WorkflowGraph>;

  // The state the parallel step "persists"; kept in a closure so the impl can
  // read it back across ticks like the real step state store.
  let persistedState: ParallelStepState | undefined;

  // Per-branch status the fake branch step settles to when run.
  let branchOutcome: (index: number) => ExecutionStatus;
  let branchRunCalls: number[];

  const makeNode = (
    overrides: Partial<EnterParallelNode['configuration']> = {}
  ): EnterParallelNode =>
    ({
      id: 'enterParallel_fanOut',
      type: 'enter-parallel',
      stepId: 'fanOut',
      stepType: 'parallel',
      exitNodeId: 'exitParallel_fanOut',
      branchStartNodeId: 'branchStep',
      configuration: {
        name: 'fanOut',
        type: 'parallel',
        foreach: JSON.stringify(['a', 'b', 'c']),
        steps: [],
        ...overrides,
      },
    } as unknown as EnterParallelNode);

  beforeEach(() => {
    persistedState = undefined;
    branchRunCalls = [];
    branchOutcome = () => ExecutionStatus.COMPLETED;

    workflowRuntime = {
      navigateToNode: jest.fn(),
      getCurrentNodeScope: jest.fn().mockReturnValue([]),
      setScopeStack: jest.fn(),
    } as unknown as jest.Mocked<WorkflowExecutionRuntimeManager>;

    stepRuntime = {
      startStep: jest.fn(),
      finishStep: jest.fn(),
      setInput: jest.fn(),
      enterWaitUntil: jest.fn(),
      getCurrentStepState: jest.fn(() => persistedState),
      setCurrentStepState: jest.fn((s: ParallelStepState) => {
        persistedState = s;
      }),
      contextManager: {
        evaluateExpressionInContext: jest.fn((x) => x),
        renderValueAccordingToContext: jest.fn((x) => x),
      },
    } as unknown as jest.Mocked<StepExecutionRuntime>;

    logger = { logDebug: jest.fn() } as unknown as jest.Mocked<IWorkflowEventLogger>;

    // Each branch run returns a runtime whose stepExecution status reflects the
    // configured outcome for that branch index.
    factory = {
      createStepExecutionRuntime: jest.fn(({ stackFrames }) => {
        const lastFrame = stackFrames[stackFrames.length - 1];
        const scopeId = lastFrame?.nestedScopes?.[lastFrame.nestedScopes.length - 1]?.scopeId;
        const index = Number(scopeId ?? 0);
        return {
          contextManager: { ensureContextReady: jest.fn() },
          get stepExecution() {
            return { status: branchOutcome(index), state: {} };
          },
          getCurrentStepResult: () => ({ output: { branch: index }, error: undefined }),
        } as unknown as StepExecutionRuntime;
      }),
    } as unknown as jest.Mocked<StepExecutionRuntimeFactory>;

    nodesFactory = {
      create: jest.fn(
        (branchRuntime: StepExecutionRuntime) =>
          ({
            run: jest.fn(() => {
              const status = (branchRuntime as unknown as { stepExecution: { status: string } })
                .stepExecution.status;
              // Record which branch index ran for concurrency assertions.
              const result = (
                branchRuntime as unknown as {
                  getCurrentStepResult: () => { output: { branch: number } };
                }
              ).getCurrentStepResult();
              branchRunCalls.push(result.output.branch);
              return status;
            }),
          } as unknown as NodeImplementation)
      ),
    } as unknown as jest.Mocked<NodesFactory>;

    // Single-step branch body: the branch start node's only successor is the
    // parallel exit node, so each branch completes after one node runs.
    workflowGraph = {
      getDirectSuccessors: jest.fn((nodeId: string) =>
        nodeId === 'branchStep' ? [{ id: 'exitParallel_fanOut' }] : []
      ),
    } as unknown as jest.Mocked<WorkflowGraph>;

    node = makeNode();
  });

  const build = () =>
    new EnterParallelNodeImpl(
      node,
      workflowRuntime,
      stepRuntime,
      logger,
      factory,
      nodesFactory,
      workflowGraph
    );

  // Re-tick the node until it finishes the step or stops making progress, mimicking
  // the resume-task loop that re-invokes a suspended parallel node across ticks.
  const runToCompletion = async (impl = build(), maxTicks = 20) => {
    for (let i = 0; i < maxTicks; i++) {
      await impl.run();
      if (stepRuntime.finishStep.mock.calls.length > 0) return;
    }
  };

  it('initializes one branch per item and starts the step', async () => {
    await build().run();
    expect(stepRuntime.startStep).toHaveBeenCalledTimes(1);
    expect(stepRuntime.setInput).toHaveBeenCalledWith({
      foreach: JSON.stringify(['a', 'b', 'c']),
    });
    expect(persistedState?.total).toBe(3);
  });

  it('finishes with index-aligned aggregate output when all branches complete', async () => {
    await build().run();
    expect(stepRuntime.finishStep).toHaveBeenCalledTimes(1);
    const output = stepRuntime.finishStep.mock.calls[0][0] as {
      total: number;
      succeeded: number;
      failed: number;
      status: string;
      results: Array<{ status: string; output: unknown }>;
    };
    expect(output).toMatchObject({ total: 3, succeeded: 3, failed: 0, status: 'completed' });
    expect(output.results.map((r) => r.status)).toEqual(['completed', 'completed', 'completed']);
    expect(workflowRuntime.navigateToNode).toHaveBeenCalledWith('exitParallel_fanOut');
  });

  it('emits per-branch index and key correlation in the results', async () => {
    await build().run();
    const output = stepRuntime.finishStep.mock.calls[0][0] as {
      results: Array<{ index: number; key: unknown; status: string }>;
    };
    expect(output.results.map((r) => r.index)).toEqual([0, 1, 2]);
    expect(output.results.map((r) => r.key)).toEqual(['a', 'b', 'c']);
  });

  it('snapshots keys at init so a foreach that re-resolves differently cannot drift', async () => {
    // A template expression whose evaluation changes between init and a later
    // pass: the snapshotted per-branch keys must reflect the INIT resolution,
    // never the mutated one.
    node = makeNode({ foreach: '{{ steps.list.output }}' });
    const evaluate = stepRuntime.contextManager.evaluateExpressionInContext as jest.Mock;
    evaluate
      .mockReturnValueOnce(['a', 'b', 'c']) // init
      .mockReturnValue(['x', 'y', 'z']); // any later re-evaluation

    await runToCompletion();

    const output = stepRuntime.finishStep.mock.calls[0][0] as {
      results: Array<{ index: number; key: unknown }>;
    };
    expect(output.results.map((r) => r.key)).toEqual(['a', 'b', 'c']);
    // Persisted branch state carries the snapshot too.
    expect(persistedState?.branches.map((b) => b.key)).toEqual(['a', 'b', 'c']);
  });

  it('reports failed branches in the aggregate and marks overall status failed', async () => {
    branchOutcome = (index) => (index === 1 ? ExecutionStatus.FAILED : ExecutionStatus.COMPLETED);
    await build().run();
    const output = stepRuntime.finishStep.mock.calls[0][0] as {
      succeeded: number;
      failed: number;
      status: string;
      results: Array<{ status: string }>;
    };
    expect(output).toMatchObject({ succeeded: 2, failed: 1, status: 'failed' });
    expect(output.results.map((r) => r.status)).toEqual(['completed', 'failed', 'completed']);
  });

  it('runs a multi-step (straight-line) branch body to completion in order', async () => {
    // Body: branchStep -> step2 -> exit. Track which nodes each branch runs.
    const ranNodes: string[] = [];
    workflowGraph.getDirectSuccessors = jest.fn((nodeId: string) => {
      if (nodeId === 'branchStep') return [{ id: 'step2' }] as never;
      if (nodeId === 'step2') return [{ id: 'exitParallel_fanOut' }] as never;
      return [] as never;
    });
    factory.createStepExecutionRuntime = jest.fn(({ nodeId, stackFrames }) => {
      const lastFrame = stackFrames[stackFrames.length - 1];
      const scopeId = lastFrame?.nestedScopes?.[lastFrame.nestedScopes.length - 1]?.scopeId;
      const index = Number(scopeId ?? 0);
      return {
        contextManager: { ensureContextReady: jest.fn() },
        get stepExecution() {
          return { status: ExecutionStatus.COMPLETED, state: {} };
        },
        getCurrentStepResult: () => ({ output: { node: nodeId, branch: index }, error: undefined }),
      } as unknown as StepExecutionRuntime;
    }) as unknown as typeof factory.createStepExecutionRuntime;
    nodesFactory.create = jest.fn(
      (branchRuntime: StepExecutionRuntime) =>
        ({
          run: jest.fn(() => {
            const result = (
              branchRuntime as unknown as {
                getCurrentStepResult: () => { output: { node: string } };
              }
            ).getCurrentStepResult();
            ranNodes.push(result.output.node);
          }),
        } as unknown as NodeImplementation)
    ) as unknown as typeof nodesFactory.create;

    await runToCompletion();

    expect(stepRuntime.finishStep).toHaveBeenCalledTimes(1);
    const output = stepRuntime.finishStep.mock.calls[0][0] as {
      total: number;
      succeeded: number;
      status: string;
    };
    expect(output).toMatchObject({ total: 3, succeeded: 3, status: 'completed' });
    // Each of the 3 branches ran both body nodes. Branches advance concurrently
    // within a tick, so the cross-branch order may interleave; we only require
    // each node to run once per branch and the first node before the second.
    expect(ranNodes.filter((n) => n === 'branchStep')).toHaveLength(3);
    expect(ranNodes.filter((n) => n === 'step2')).toHaveLength(3);
    expect(ranNodes.indexOf('branchStep')).toBeLessThan(ranNodes.indexOf('step2'));
  });

  it('advances eligible branches concurrently within a tick (no serialization)', async () => {
    // Each branch "blocks" on an async gate. If branches were advanced
    // sequentially, only one would be in-flight at a time. We assert all three
    // are in-flight simultaneously before any resolves.
    let inFlight = 0;
    let maxInFlight = 0;
    const gates: Array<() => void> = [];
    nodesFactory.create = jest.fn(
      () =>
        ({
          run: jest.fn(async () => {
            inFlight += 1;
            maxInFlight = Math.max(maxInFlight, inFlight);
            await new Promise<void>((resolve) => gates.push(resolve));
            inFlight -= 1;
          }),
        } as unknown as NodeImplementation)
    ) as unknown as typeof nodesFactory.create;

    const runPromise = build().run();
    // Let all three branch run() bodies start and register their gates.
    await new Promise((r) => setTimeout(r, 0));
    expect(maxInFlight).toBe(3);
    // Release all gates so the tick can finish.
    gates.forEach((release) => release());
    await runPromise;
  });

  it('aborts and times out a blocking branch that exceeds its branch-timeout', async () => {
    node = makeNode({ 'branch-timeout': '20ms', mode: 'settled' });
    const aborts: boolean[] = [];
    factory.createStepExecutionRuntime = jest.fn(({ stackFrames }) => {
      const lastFrame = stackFrames[stackFrames.length - 1];
      const scopeId = lastFrame?.nestedScopes?.[lastFrame.nestedScopes.length - 1]?.scopeId;
      const index = Number(scopeId ?? 0);
      const abortController = new AbortController();
      return {
        abortController,
        contextManager: { ensureContextReady: jest.fn() },
        get stepExecution() {
          // Never settles on its own; only the timeout abort ends it.
          return { status: ExecutionStatus.RUNNING, state: {} };
        },
        getCurrentStepResult: () => ({ output: { branch: index }, error: undefined }),
      } as unknown as StepExecutionRuntime;
    }) as unknown as typeof factory.createStepExecutionRuntime;
    nodesFactory.create = jest.fn(
      (branchRuntime: StepExecutionRuntime) =>
        ({
          run: jest.fn(
            () =>
              new Promise<void>((resolve) => {
                // Resolve only when this branch's signal is aborted.
                branchRuntime.abortController.signal.addEventListener('abort', () => {
                  aborts.push(true);
                  resolve();
                });
              })
          ),
        } as unknown as NodeImplementation)
    ) as unknown as typeof nodesFactory.create;

    await runToCompletion();

    expect(aborts.length).toBeGreaterThan(0);
    const output = stepRuntime.finishStep.mock.calls[0][0] as {
      status: string;
      results: Array<{ status: string }>;
    };
    expect(output.status).toBe('failed');
    expect(output.results.every((r) => r.status === 'timed_out')).toBe(true);
  });

  it('suspends (enterWaitUntil) and does not finish while a branch is still in flight', async () => {
    branchOutcome = (index) => (index === 2 ? ExecutionStatus.WAITING : ExecutionStatus.COMPLETED);
    await build().run();
    expect(stepRuntime.enterWaitUntil).toHaveBeenCalledTimes(1);
    expect(stepRuntime.finishStep).not.toHaveBeenCalled();
    // On suspend the parallel reclaims the shared cursor for its own enter node
    // (branch body steps advance the cursor as they run) so the resume task
    // re-ticks the parallel instead of re-entering a leaked branch-body node.
    expect(workflowRuntime.navigateToNode).toHaveBeenCalledWith('enterParallel_fanOut');
    expect(workflowRuntime.navigateToNode).not.toHaveBeenCalledWith('exitParallel_fanOut');
  });

  it('respects the concurrency window, starting at most `max` branches on a tick', async () => {
    node = makeNode({
      foreach: JSON.stringify(['a', 'b', 'c', 'd']),
      concurrency: { max: 2 },
    });
    // Keep every branch in flight so none free a slot within the tick.
    branchOutcome = () => ExecutionStatus.WAITING;
    await build().run();
    expect(branchRunCalls).toEqual([0, 1]);
  });

  it('finishes immediately with an empty aggregate when there are no items', async () => {
    node = makeNode({ foreach: JSON.stringify([]) });
    await build().run();
    expect(stepRuntime.finishStep).toHaveBeenCalledTimes(1);
    const output = stepRuntime.finishStep.mock.calls[0][0] as { total: number; status: string };
    expect(output).toMatchObject({ total: 0, status: 'completed' });
    expect(workflowRuntime.navigateToNode).toHaveBeenCalledWith('exitParallel_fanOut');
  });

  it('fail-fast (default): a failed branch skips not-yet-started branches', async () => {
    // Sequential window so a failure on branch 0 is visible before 1/2 start.
    node = makeNode({ concurrency: { max: 1 } });
    branchOutcome = (index) => (index === 0 ? ExecutionStatus.FAILED : ExecutionStatus.COMPLETED);
    await runToCompletion();
    expect(branchRunCalls).toEqual([0]);
    const output = stepRuntime.finishStep.mock.calls[0][0] as {
      succeeded: number;
      failed: number;
      status: string;
      results: Array<{ status: string }>;
    };
    expect(output).toMatchObject({ succeeded: 0, failed: 1, status: 'failed' });
    expect(output.results.map((r) => r.status)).toEqual(['failed', 'skipped', 'skipped']);
    expect(workflowRuntime.navigateToNode).toHaveBeenCalledWith('exitParallel_fanOut');
  });

  it('settled: every branch runs to terminal even after a failure', async () => {
    node = makeNode({ concurrency: { max: 1 }, mode: 'settled' });
    branchOutcome = (index) => (index === 0 ? ExecutionStatus.FAILED : ExecutionStatus.COMPLETED);
    await runToCompletion();
    expect(branchRunCalls).toEqual([0, 1, 2]);
    const output = stepRuntime.finishStep.mock.calls[0][0] as {
      succeeded: number;
      failed: number;
      status: string;
      results: Array<{ status: string }>;
    };
    expect(output).toMatchObject({ succeeded: 2, failed: 1, status: 'failed' });
    expect(output.results.map((r) => r.status)).toEqual(['failed', 'completed', 'completed']);
  });

  it('rejects a fan-out that exceeds the maximum', async () => {
    const items = Array.from({ length: DEFAULT_PARALLEL_MAX_FAN_OUT + 1 }, (_v, i) => i);
    node = makeNode({ foreach: JSON.stringify(items) });
    await expect(build().run()).rejects.toThrow(/exceeds the maximum/);
    expect(stepRuntime.finishStep).not.toHaveBeenCalled();
  });

  it('clamps an out-of-range concurrency to the ceiling', async () => {
    const size = DEFAULT_PARALLEL_MAX_CONCURRENCY + 5;
    const items = Array.from({ length: size }, (_v, i) => i);
    node = makeNode({
      foreach: JSON.stringify(items),
      // Bypasses schema validation to assert the runtime clamp directly.
      concurrency: { max: size + 100 },
    });
    branchOutcome = () => ExecutionStatus.WAITING;
    await build().run();
    expect(branchRunCalls).toHaveLength(DEFAULT_PARALLEL_MAX_CONCURRENCY);
  });

  describe('timeouts', () => {
    let nowMs: number;

    beforeEach(() => {
      nowMs = 1_000;
      jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('fails the step with timed_out branches when the overall timeout elapses', async () => {
      node = makeNode({ timeout: '5s' });
      // Branches park in a durable wait so they remain in flight across ticks.
      branchOutcome = () => ExecutionStatus.WAITING;
      const impl = build();

      await impl.run();
      expect(stepRuntime.enterWaitUntil).toHaveBeenCalled();
      expect(stepRuntime.finishStep).not.toHaveBeenCalled();

      // Advance past the 5s overall budget and re-tick.
      nowMs += 6_000;
      await impl.run();

      expect(stepRuntime.finishStep).toHaveBeenCalledTimes(1);
      const output = stepRuntime.finishStep.mock.calls[0][0] as {
        failed: number;
        status: string;
        results: Array<{ status: string }>;
      };
      expect(output.status).toBe('failed');
      expect(output.results.every((r) => r.status === 'timed_out')).toBe(true);
      expect(workflowRuntime.navigateToNode).toHaveBeenCalledWith('exitParallel_fanOut');
    });

    it('times out only the branch that exceeds the per-branch budget', async () => {
      node = makeNode({
        foreach: JSON.stringify(['a', 'b']),
        concurrency: { max: 2, 'count-waiting': true },
        mode: 'settled',
        'branch-timeout': '3s',
      });
      // Branch 0 keeps polling; branch 1 completes on the first tick.
      branchOutcome = (index) =>
        index === 0 ? ExecutionStatus.WAITING : ExecutionStatus.COMPLETED;
      const impl = build();

      await impl.run();
      expect(stepRuntime.finishStep).not.toHaveBeenCalled();

      // Past the per-branch budget; the still-running branch 0 times out.
      nowMs += 4_000;
      await impl.run();

      expect(stepRuntime.finishStep).toHaveBeenCalledTimes(1);
      const output = stepRuntime.finishStep.mock.calls[0][0] as {
        results: Array<{ status: string }>;
        status: string;
      };
      expect(output.results.map((r) => r.status)).toEqual(['timed_out', 'completed']);
      expect(output.status).toBe('failed');
    });
  });

  describe('static branches (scatter-gather)', () => {
    const makeStaticNode = (
      branches: Array<{ name: string; startNodeId: string }>,
      configOverrides: Partial<EnterParallelNode['configuration']> = {}
    ): EnterParallelNode =>
      ({
        id: 'enterParallel_fanOut',
        type: 'enter-parallel',
        stepId: 'fanOut',
        stepType: 'parallel',
        exitNodeId: 'exitParallel_fanOut',
        // No branchStartNodeId in static mode.
        branches,
        configuration: {
          name: 'fanOut',
          type: 'parallel',
          ...configOverrides,
        },
      } as unknown as EnterParallelNode);

    beforeEach(() => {
      // Each branch is a single node whose only successor is the exit node.
      workflowGraph.getDirectSuccessors = jest.fn(() => [
        { id: 'exitParallel_fanOut' },
      ]) as unknown as typeof workflowGraph.getDirectSuccessors;
    });

    it('runs each named branch and emits name-keyed, index-aligned results', async () => {
      node = makeStaticNode([
        { name: 'virustotal', startNodeId: 'vt_step' },
        { name: 'geo', startNodeId: 'geo_step' },
      ]);

      await build().run();

      expect(stepRuntime.finishStep).toHaveBeenCalledTimes(1);
      const output = stepRuntime.finishStep.mock.calls[0][0] as {
        total: number;
        succeeded: number;
        status: string;
        results: Array<{ index: number; key: unknown; status: string }>;
      };
      expect(output).toMatchObject({ total: 2, succeeded: 2, status: 'completed' });
      expect(output.results.map((r) => r.index)).toEqual([0, 1]);
      expect(output.results.map((r) => r.key)).toEqual(['virustotal', 'geo']);
      expect(output.results.map((r) => r.status)).toEqual(['completed', 'completed']);
    });

    it('starts each branch at its own start node (heterogeneous bodies)', async () => {
      node = makeStaticNode([
        { name: 'virustotal', startNodeId: 'vt_step' },
        { name: 'geo', startNodeId: 'geo_step' },
      ]);
      const startedNodes: string[] = [];
      factory.createStepExecutionRuntime = jest.fn(({ nodeId }) => {
        startedNodes.push(nodeId);
        return {
          contextManager: { ensureContextReady: jest.fn() },
          get stepExecution() {
            return { status: ExecutionStatus.COMPLETED, state: {} };
          },
          getCurrentStepResult: () => ({ output: { node: nodeId }, error: undefined }),
        } as unknown as StepExecutionRuntime;
      }) as unknown as typeof factory.createStepExecutionRuntime;

      await build().run();

      expect(startedNodes).toEqual(expect.arrayContaining(['vt_step', 'geo_step']));
    });

    it('runs static branches concurrently within a tick', async () => {
      node = makeStaticNode(
        [
          { name: 'a', startNodeId: 'a_step' },
          { name: 'b', startNodeId: 'b_step' },
        ],
        { concurrency: { max: 2, 'count-waiting': true } }
      );
      let inFlight = 0;
      let maxInFlight = 0;
      const gates: Array<() => void> = [];
      nodesFactory.create = jest.fn(
        () =>
          ({
            run: jest.fn(async () => {
              inFlight += 1;
              maxInFlight = Math.max(maxInFlight, inFlight);
              await new Promise<void>((resolve) => gates.push(resolve));
              inFlight -= 1;
            }),
          } as unknown as NodeImplementation)
      ) as unknown as typeof nodesFactory.create;

      const runPromise = build().run();
      await new Promise((r) => setTimeout(r, 0));
      expect(maxInFlight).toBe(2);
      gates.forEach((release) => release());
      await runPromise;
    });

    it('reports a failed static branch in the aggregate', async () => {
      node = makeStaticNode([
        { name: 'ok', startNodeId: 'ok_step' },
        { name: 'bad', startNodeId: 'bad_step' },
      ]);
      factory.createStepExecutionRuntime = jest.fn(({ nodeId }) => {
        const failed = nodeId === 'bad_step';
        return {
          contextManager: { ensureContextReady: jest.fn() },
          get stepExecution() {
            return {
              status: failed ? ExecutionStatus.FAILED : ExecutionStatus.COMPLETED,
              state: {},
            };
          },
          getCurrentStepResult: () => ({
            output: failed ? undefined : { node: nodeId },
            error: failed ? { message: 'boom' } : undefined,
          }),
        } as unknown as StepExecutionRuntime;
      }) as unknown as typeof factory.createStepExecutionRuntime;

      node = makeStaticNode(
        [
          { name: 'ok', startNodeId: 'ok_step' },
          { name: 'bad', startNodeId: 'bad_step' },
        ],
        { mode: 'settled' }
      );

      await build().run();

      const output = stepRuntime.finishStep.mock.calls[0][0] as {
        succeeded: number;
        failed: number;
        status: string;
        results: Array<{ key: unknown; status: string }>;
      };
      expect(output).toMatchObject({ succeeded: 1, failed: 1, status: 'failed' });
      expect(output.results.map((r) => r.key)).toEqual(['ok', 'bad']);
      expect(output.results.map((r) => r.status)).toEqual(['completed', 'failed']);
    });
  });
});
