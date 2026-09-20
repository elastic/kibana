/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';

import ATTACK_DISCOVERY_REVIEW_YAML from './attack_discovery_review.yaml';
import ATTACK_DISCOVERY_RUNNER_YAML from './attack_discovery_runner.yaml';
import {
  ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW,
  ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW,
} from './attack_discovery_workflows';
import { ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW } from './detection_rule_tuning';
import DETECTION_RULE_TUNING_YAML from './detection_rule_tuning.yaml';
import FLOOR_ALERT_TRIAGE_YAML from './floor_alert_triage.yaml';
import { ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW } from './floor_attack_discovery';
import FLOOR_ATTACK_DISCOVERY_YAML from './floor_attack_discovery.yaml';
import RULE_TUNING_REVIEW_YAML from './rule_tuning_review.yaml';
import RULE_TUNING_WORKER_YAML from './rule_tuning_worker.yaml';
import {
  ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW,
  ALERTZERO_RULE_TUNING_WORKER_WORKFLOW,
} from './rule_workflows';
import { renderCommonWorkerYaml, renderScheduledWorkerYaml } from './worker_template_values';
import { createWorkflowLiquidEngine } from '../../../common/utils';

interface WorkflowStep {
  name?: string;
  type?: string;
  'agent-id'?: string;
  with?: { 'workflow-id'?: string; inputs?: Record<string, unknown>; agent_id?: string };
  steps?: WorkflowStep[];
  branches?: Array<{ steps?: WorkflowStep[] }>;
}

const flattenSteps = (steps: WorkflowStep[] = []): WorkflowStep[] =>
  steps.flatMap((step) => [
    step,
    ...flattenSteps(step.steps),
    ...flattenSteps((step.branches ?? []).flatMap((branch) => branch.steps ?? [])),
  ]);

const parseSteps = (yaml: string): WorkflowStep[] =>
  flattenSteps((parse(yaml) as { steps?: WorkflowStep[] }).steps);

/**
 * Every step type that binds an Agent Builder agent, and the key each one uses.
 * `ai.agent` takes a hyphenated top-level config key; `ai.conversation.create`
 * takes a snake_case `with:` input. Both must carry the Worker's agent, so both
 * belong here -- filtering to `ai.agent` alone is what let the conversation
 * steps drift unbound.
 */
const AGENT_BINDING_STEP_TYPES = ['ai.agent', 'ai.conversation.create'] as const;

const agentBindingOf = (step: WorkflowStep): string | undefined =>
  step.type === 'ai.agent' ? step['agent-id'] : step.with?.agent_id;

/** Steps that actually dispatch to an agent, i.e. the ones `agent-id` governs. */
const agentSteps = (yaml: string): WorkflowStep[] =>
  parseSteps(yaml).filter((step) => step.type === 'ai.agent');

/** Every agent-binding step, regardless of which key spelling the type uses. */
const agentBindingSteps = (yaml: string): WorkflowStep[] =>
  parseSteps(yaml).filter((step) =>
    (AGENT_BINDING_STEP_TYPES as readonly string[]).includes(step.type ?? '')
  );

/**
 * Every hand-off to another workflow: the edges of a Worker's chain. Async
 * hand-offs count -- a Worker that parks on a long review still has to carry the
 * agent across.
 */
const childInvocations = (yaml: string): WorkflowStep[] =>
  parseSteps(yaml).filter(
    (step) => step.type === 'workflow.execute' || step.type === 'workflow.executeAsync'
  );

const AGENT = 'significant-events.investigation';

const scheduled = (agentId?: string) => ({
  settingsVersion: 1,
  autonomyLevel: 'manual' as const,
  scheduleInterval: '24h',
  ...(agentId === undefined ? {} : { agentId }),
});

describe('Worker agent id propagation', () => {
  describe('through a chain of workflows', () => {
    // Rule Tuning is the deepest chain a Worker owns:
    //   detection_rule_tuning (the Worker)
    //     -> rule_tuning_worker        (global sweep)
    //       -> rule_tuning_review      (one per noisy rule, in a foreach fan-out)
    //         -> `diagnose_rule`       (the ai.agent step that finally runs)
    // The agent must survive all three hand-offs, not just the first.
    const agentIdInputOf = (step: WorkflowStep) => step.with?.inputs?.agent_id;

    it('defines the agent const the chain reads, so the reference resolves', () => {
      // The hand-off reads `consts.worker_settings.agentId`. If the Worker never
      // renders that const, Liquid quietly yields "" and the picked agent is lost
      // with every string assertion in this file still passing.
      const rendered = renderScheduledWorkerYaml(DETECTION_RULE_TUNING_YAML, {
        ...scheduled(AGENT),
        extras: { analysisWindowDays: 14 },
      });
      const consts = (parse(rendered) as { consts?: { worker_settings?: Record<string, unknown> } })
        .consts;

      expect(consts?.worker_settings?.agentId).toBe(AGENT);
    });

    it('omits the agent const entirely when the Worker has none', () => {
      const rendered = renderScheduledWorkerYaml(DETECTION_RULE_TUNING_YAML, {
        ...scheduled(),
        extras: { analysisWindowDays: 14 },
      });
      const consts = (parse(rendered) as { consts?: { worker_settings?: Record<string, unknown> } })
        .consts;

      expect(consts?.worker_settings).not.toHaveProperty('agentId');
    });

    // END-TO-END: install-time render + the real runtime Liquid engine, hop by hop.
    // The assertions above prove the templates are WIRED; this one proves they RESOLVE.
    // Liquid is non-strict on variables, so a broken reference yields "" rather than
    // throwing -- exactly the silent loss this walks the whole chain to rule out.
    const runChain = async (agentId?: string) => {
      const engine = createWorkflowLiquidEngine({ strictFilters: true });
      const render = async (yaml: string, context: Record<string, unknown>) =>
        await engine.parseAndRender(yaml, context);

      // Hop 0: the Worker is rendered at install time, before any Liquid context exists.
      const workerYaml = renderScheduledWorkerYaml(DETECTION_RULE_TUNING_YAML, {
        ...scheduled(agentId),
        extras: { analysisWindowDays: 14 },
      });
      const consts = (parse(workerYaml) as { consts?: Record<string, unknown> }).consts ?? {};

      // Hop 1: Worker -> sweep. The engine resolves `with.inputs` before dispatch,
      // the same call the execute step makes (renderValueAccordingToContext).
      const toSweep = childInvocations(workerYaml)[0];
      const sweepInputs = parse(
        await render(JSON.stringify(toSweep.with?.inputs ?? {}), { consts })
      ) as Record<string, unknown>;

      // Hop 2: sweep -> per-rule review, inside the foreach fan-out.
      const toReview = childInvocations(RULE_TUNING_WORKER_YAML)[0];
      const reviewInputs = parse(
        await render(JSON.stringify(toReview.with?.inputs ?? {}), { inputs: sweepInputs })
      ) as Record<string, unknown>;

      // Hop 3: the leaf ai.agent step that actually runs.
      const diagnose = agentSteps(RULE_TUNING_REVIEW_YAML)[0];
      const resolvedAgentId = await render(String(diagnose['agent-id'] ?? ''), {
        inputs: reviewInputs,
      });

      return { sweepInputs, reviewInputs, resolvedAgentId };
    };

    it('carries the picked agent through every hop to the agent step that runs', async () => {
      const { sweepInputs, reviewInputs, resolvedAgentId } = await runChain(AGENT);

      expect(sweepInputs.agent_id).toBe(AGENT);
      expect(reviewInputs.agent_id).toBe(AGENT);
      expect(resolvedAgentId).toBe(AGENT);
    });

    it('resolves to no agent at all when the Worker picked none', async () => {
      const { sweepInputs, reviewInputs, resolvedAgentId } = await runChain();

      // Absent, not the literal "__WORKER_AGENT_ID__" and not a stray default:
      // the step falls back to the agent it already used before this feature.
      expect(sweepInputs.agent_id).toBe('');
      expect(reviewInputs.agent_id).toBe('');
      expect(resolvedAgentId).toBe('');
    });

    it('sends the agent from the Worker into the workflow it dispatches', () => {
      const rendered = renderScheduledWorkerYaml(DETECTION_RULE_TUNING_YAML, {
        ...scheduled(AGENT),
        extras: { analysisWindowDays: 14 },
      });
      const handOffs = childInvocations(rendered);

      expect(handOffs.length).toBeGreaterThan(0);
      expect(handOffs.map(agentIdInputOf)).toEqual(
        handOffs.map(() => "{{ consts.worker_settings.agentId | default: '' }}")
      );
    });

    it('keeps forwarding the agent at every deeper hand-off', () => {
      // The middle of the chain: whatever it received must go out to each review it
      // launches. A hop that accepts the agent and drops it fails here.
      const handOffs = childInvocations(RULE_TUNING_WORKER_YAML).filter(
        (step) => step.with?.['workflow-id'] === 'system-security-rule-tuning-review'
      );

      expect(handOffs.length).toBeGreaterThan(0);
      expect(handOffs.map(agentIdInputOf)).toEqual(
        handOffs.map(() => "{{ inputs.agent_id | default: '' }}")
      );
    });

    it('reaches the agent step at the end of the chain', () => {
      // The last hop: arriving at the leaf workflow is worthless unless the agent
      // step itself consumes it.
      const steps = agentSteps(RULE_TUNING_REVIEW_YAML);

      expect(steps.length).toBeGreaterThan(0);
      expect(steps.map((step) => step['agent-id'])).toEqual(
        steps.map(() => "{{ inputs.agent_id | default: '' }}")
      );
    });

    it('declares the agent input on every workflow in the chain that is handed one', () => {
      // A workflow that is passed an input it never declares would have it dropped
      // by the engine, so the chain is only sound if each link declares it.
      const declaresAgentInput = (yaml: string) =>
        (
          parse(yaml) as { triggers?: Array<{ inputs?: { properties?: Record<string, unknown> } }> }
        ).triggers?.some((trigger) => trigger.inputs?.properties?.agent_id !== undefined) ?? false;

      expect(declaresAgentInput(RULE_TUNING_WORKER_YAML)).toBe(true);
      expect(declaresAgentInput(RULE_TUNING_REVIEW_YAML)).toBe(true);
    });
  });

  describe('through the Attack Discovery chain', () => {
    // Attack Discovery is the chain the product treats as the reference case:
    //   floor_attack_discovery (the Worker)
    //     -> attack_discovery_runner   (generation + fan-out)
    //       -> attack_discovery_review (one per discovery, async)
    //         -> `open_investigation`  (the ai.conversation.create step that runs)
    // Its leaf is a conversation step rather than an ai.agent step, so the agent has
    // to survive hand-offs AND land on a different step type than Rule Tuning's.
    const agentIdInputOf = (step: WorkflowStep) => step.with?.inputs?.agent_id;

    /** The AD leaf: opening an investigation binds it to an agent. */
    const conversationSteps = (yaml: string): WorkflowStep[] =>
      parseSteps(yaml).filter((step) => step.type === 'ai.conversation.create');

    const scheduledAd = (agentId?: string) => ({
      settingsVersion: 1,
      autonomyLevel: 'manual' as const,
      scheduleInterval: '24h',
      ...(agentId === undefined ? {} : { agentId }),
    });

    it('defines the agent const the chain reads, so the reference resolves', () => {
      const rendered = renderScheduledWorkerYaml(FLOOR_ATTACK_DISCOVERY_YAML, scheduledAd(AGENT));
      const consts = (parse(rendered) as { consts?: { worker_settings?: Record<string, unknown> } })
        .consts;

      expect(consts?.worker_settings?.agentId).toBe(AGENT);
    });

    it('omits the agent const entirely when the Worker has none', () => {
      const rendered = renderScheduledWorkerYaml(FLOOR_ATTACK_DISCOVERY_YAML, scheduledAd());
      const consts = (parse(rendered) as { consts?: { worker_settings?: Record<string, unknown> } })
        .consts;

      expect(consts?.worker_settings).not.toHaveProperty('agentId');
    });

    // END-TO-END: install-time render + the real runtime Liquid engine, hop by hop.
    // Liquid is non-strict on variables, so a broken reference yields "" instead of
    // throwing -- the silent loss this walks the whole chain to rule out.
    const runChain = async (agentId?: string) => {
      const engine = createWorkflowLiquidEngine({ strictFilters: true });
      const render = async (yaml: string, context: Record<string, unknown>) =>
        await engine.parseAndRender(yaml, context);

      // Values are rendered one at a time, the way the engine resolves a step's
      // `with.inputs`. Rendering the whole object as JSON would escape the quotes in
      // references like `foreach.item["kibana.alert.uuid"]` and fail to tokenize.
      const renderInputs = async (
        inputs: Record<string, unknown> = {},
        context: Record<string, unknown>
      ): Promise<Record<string, unknown>> =>
        Object.fromEntries(
          await Promise.all(
            Object.entries(inputs).map(async ([key, value]) => [
              key,
              typeof value === 'string' ? await render(value, context) : value,
            ])
          )
        );

      // Hop 0: install-time render, before any Liquid context exists.
      const workerYaml = renderScheduledWorkerYaml(
        FLOOR_ATTACK_DISCOVERY_YAML,
        scheduledAd(agentId)
      );
      const consts = (parse(workerYaml) as { consts?: Record<string, unknown> }).consts ?? {};

      // Hop 1: Worker -> runner.
      const toRunner = childInvocations(workerYaml)[0];
      const runnerInputs = await renderInputs(toRunner.with?.inputs, { consts });

      // Hop 2: runner -> review, inside the per-discovery fan-out.
      const toReview = childInvocations(ATTACK_DISCOVERY_RUNNER_YAML).filter(
        (step) => step.with?.['workflow-id'] === 'system-security-attack-discovery-review'
      )[0];
      const reviewInputs = await renderInputs(toReview.with?.inputs, { inputs: runnerInputs });

      // Hop 3: the leaf conversation step that actually binds an agent.
      const openInvestigation = conversationSteps(ATTACK_DISCOVERY_REVIEW_YAML)[0];
      const resolvedAgentId = await render(String(openInvestigation.with?.agent_id ?? ''), {
        inputs: reviewInputs,
      });

      return { runnerInputs, reviewInputs, resolvedAgentId };
    };

    it('carries the picked agent through every hop to the step that opens the investigation', async () => {
      const { runnerInputs, reviewInputs, resolvedAgentId } = await runChain(AGENT);

      expect(runnerInputs.agent_id).toBe(AGENT);
      expect(reviewInputs.agent_id).toBe(AGENT);
      expect(resolvedAgentId).toBe(AGENT);
    });

    it('resolves to no agent at all when the Worker picked none', async () => {
      const { runnerInputs, reviewInputs, resolvedAgentId } = await runChain();

      // Absent, not the literal "__WORKER_AGENT_ID__" and not a stray default: the
      // step normalizes blank back to the default agent it used before this feature.
      expect(runnerInputs.agent_id).toBe('');
      expect(reviewInputs.agent_id).toBe('');
      expect(resolvedAgentId).toBe('');
    });

    it('sends the agent from the Worker into the runner it dispatches', () => {
      const rendered = renderScheduledWorkerYaml(FLOOR_ATTACK_DISCOVERY_YAML, scheduledAd(AGENT));
      const handOffs = childInvocations(rendered);

      expect(handOffs.length).toBeGreaterThan(0);
      expect(handOffs.map(agentIdInputOf)).toEqual(
        handOffs.map(() => "{{ consts.worker_settings.agentId | default: '' }}")
      );
    });

    it('keeps forwarding the agent at every deeper hand-off', () => {
      // A hop that accepts the agent and drops it on the way out fails here.
      const handOffs = childInvocations(ATTACK_DISCOVERY_RUNNER_YAML).filter(
        (step) => step.with?.['workflow-id'] === 'system-security-attack-discovery-review'
      );

      expect(handOffs.length).toBeGreaterThan(0);
      expect(handOffs.map(agentIdInputOf)).toEqual(
        handOffs.map(() => "{{ inputs.agent_id | default: '' }}")
      );
    });

    it('reaches the step at the end of the chain that binds the agent', () => {
      const steps = conversationSteps(ATTACK_DISCOVERY_REVIEW_YAML);

      expect(steps.length).toBeGreaterThan(0);
      expect(steps.map((step) => step.with?.agent_id)).toEqual(
        steps.map(() => "{{ inputs.agent_id | default: '' }}")
      );
    });

    it('declares the agent input on every workflow in the chain that is handed one', () => {
      const declaresAgentInput = (yaml: string) =>
        (
          parse(yaml) as { triggers?: Array<{ inputs?: { properties?: Record<string, unknown> } }> }
        ).triggers?.some((trigger) => trigger.inputs?.properties?.agent_id !== undefined) ?? false;

      expect(declaresAgentInput(ATTACK_DISCOVERY_RUNNER_YAML)).toBe(true);
      expect(declaresAgentInput(ATTACK_DISCOVERY_REVIEW_YAML)).toBe(true);
    });
  });

  describe('when the Worker has an agent', () => {
    it('sends every agent step to the picked agent', () => {
      const rendered = renderScheduledWorkerYaml(FLOOR_ALERT_TRIAGE_YAML, scheduled(AGENT));
      const steps = agentSteps(rendered);

      // Guards the assertion below: an empty list would make `every` vacuously true.
      expect(steps.length).toBeGreaterThan(0);
      expect(steps.map((step) => step['agent-id'])).toEqual(steps.map(() => AGENT));
    });

    it('overrides an agent the workflow had hardcoded', () => {
      const before = agentSteps(renderScheduledWorkerYaml(FLOOR_ALERT_TRIAGE_YAML, scheduled()));
      const after = agentSteps(
        renderScheduledWorkerYaml(FLOOR_ALERT_TRIAGE_YAML, scheduled(AGENT))
      );

      // The step names its own agent when nothing is picked, so an unchanged value
      // here would mean the Worker setting never reached it.
      expect(before.map((step) => step['agent-id'])).toEqual(
        before.map(() => 'alertzero-thin-agent')
      );
      expect(after.map((step) => step['agent-id'])).toEqual(after.map(() => AGENT));
    });
  });

  describe('when the Worker in a chain has no agent', () => {
    it('hands an empty agent down the chain rather than a placeholder', () => {
      // Unset must stay unset the whole way: the leaf step reads a blank agent as
      // "use the default", which is the behaviour that predates this feature.
      const rendered = renderScheduledWorkerYaml(DETECTION_RULE_TUNING_YAML, {
        ...scheduled(),
        extras: { analysisWindowDays: 14 },
      });

      expect(rendered).not.toContain('__WORKER_AGENT_ID__');
      expect(rendered).toContain(
        'agent_id: "{{ consts.worker_settings.agentId | default: \'\' }}"'
      );
    });
  });

  describe('when the Worker has no agent', () => {
    it('leaves each agent step on the agent the workflow declared', () => {
      const rendered = renderScheduledWorkerYaml(FLOOR_ALERT_TRIAGE_YAML, scheduled());
      const steps = agentSteps(rendered);

      expect(steps.length).toBeGreaterThan(0);
      expect(steps.map((step) => step['agent-id'])).toEqual(
        steps.map(() => 'alertzero-thin-agent')
      );
    });

    it('renders no placeholder and no empty agent', () => {
      const rendered = renderScheduledWorkerYaml(FLOOR_ALERT_TRIAGE_YAML, scheduled());

      expect(rendered).not.toContain('__WORKER_AGENT_ID__');
      // An empty `agent-id` is not equivalent to an absent one: it would override the
      // step's own agent with nothing rather than leaving it untouched.
      expect(rendered).not.toMatch(/agent-id:\s*(''|""|$)/m);
    });

    it('renders exactly what a plain hardcoded agent would', () => {
      // The strongest statement of "no agent picked changes nothing": the render must
      // equal the same workflow with the placeholder replaced by its own default.
      const rendered = renderCommonWorkerYaml(FLOOR_ALERT_TRIAGE_YAML, {
        settingsVersion: 1,
        autonomyLevel: 'manual',
      });

      const withoutFeature = FLOOR_ALERT_TRIAGE_YAML.replace(
        '__WORKER_AGENT_ID_OR:alertzero-thin-agent__',
        'alertzero-thin-agent'
      );
      // Guards against a typo silently making this a no-op comparison.
      expect(withoutFeature).not.toBe(FLOOR_ALERT_TRIAGE_YAML);

      expect(rendered).toBe(
        renderCommonWorkerYaml(withoutFeature, {
          settingsVersion: 1,
          autonomyLevel: 'manual',
        })
      );
    });
  });
});

describe('managed workflow versions for the agent chain', () => {
  /**
   * The parent is a `yamlTemplate` definition, so its registry hash is computed over the template
   * *function's* source -- editing `detection_rule_tuning.yaml` leaves that hash untouched and
   * drift detection blind. The declared `version` is therefore the only signal that upgrades an
   * already-installed Worker, and it has to move whenever the chain's YAML changes.
   */
  it('keeps the chain parent ahead of the version that shipped without agent propagation', () => {
    expect(ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW.version).toBeGreaterThan(6);
  });

  it('bumps every sub-workflow that carries the agent down the chain', () => {
    expect(ALERTZERO_RULE_TUNING_WORKER_WORKFLOW.version).toBeGreaterThan(25);
    // 22 shipped the diagnose step bound but left `create_investigation` on the
    // default agent, so binding it has to reinstall again.
    expect(ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW.version).toBeGreaterThan(22);
  });

  it('keeps the Attack Discovery Worker ahead of its pre-propagation version', () => {
    expect(ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW.version).toBeGreaterThan(3);
  });

  it('bumps every Attack Discovery sub-workflow that carries the agent down the chain', () => {
    expect(ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW.version).toBeGreaterThan(3);
    expect(ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW.version).toBeGreaterThan(2);
  });
});

/**
 * A chain is only as good as its least-wired step. Both propagation bugs found so far were
 * the same shape: one step in a chain binds the Worker's agent and a sibling silently runs
 * the default. Enumerating every agent-binding step in every Worker chain is what catches
 * that, rather than asserting on the steps we happened to remember.
 */
describe('every agent-binding step in a Worker chain binds the Worker agent', () => {
  const CHAIN_WORKFLOWS: Array<[name: string, yaml: string]> = [
    ['floor_alert_triage.yaml', FLOOR_ALERT_TRIAGE_YAML],
    ['floor_attack_discovery.yaml', FLOOR_ATTACK_DISCOVERY_YAML],
    ['attack_discovery_runner.yaml', ATTACK_DISCOVERY_RUNNER_YAML],
    ['attack_discovery_review.yaml', ATTACK_DISCOVERY_REVIEW_YAML],
    ['detection_rule_tuning.yaml', DETECTION_RULE_TUNING_YAML],
    ['rule_tuning_worker.yaml', RULE_TUNING_WORKER_YAML],
    ['rule_tuning_review.yaml', RULE_TUNING_REVIEW_YAML],
  ];

  it.each(CHAIN_WORKFLOWS)('%s leaves no agent-binding step unbound', (_name, yaml) => {
    const unbound = agentBindingSteps(yaml)
      .filter((step) => agentBindingOf(step) === undefined)
      .map((step) => `${step.name ?? '(unnamed)'} [${step.type}]`);

    expect(unbound).toEqual([]);
  });

  it('covers both agent-binding step types, so neither spelling can drift unnoticed', () => {
    // Without this, the suite above could pass simply because one of the two step
    // types stopped appearing in any chain.
    const typesSeen = new Set(
      CHAIN_WORKFLOWS.flatMap(([, yaml]) => agentBindingSteps(yaml).map((step) => step.type))
    );

    expect([...typesSeen].sort()).toEqual([...AGENT_BINDING_STEP_TYPES].sort());
  });

  it('carries the picked agent into the conversation the Rule Tuning review opens', () => {
    // The investigation is where an analyst picks the work up, so it has to open
    // against the Worker's agent rather than the default.
    const rendered = renderCommonWorkerYaml(RULE_TUNING_REVIEW_YAML, {
      settingsVersion: 1,
      autonomyLevel: 'manual',
      agentId: AGENT,
    });

    const conversation = agentBindingSteps(rendered).find(
      (step) => step.type === 'ai.conversation.create'
    );

    expect(conversation).toBeDefined();
    expect(agentBindingOf(conversation!)).toBe("{{ inputs.agent_id | default: '' }}");
  });
});
