/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';

import {
  PND_AD_GENERATION_TEMPLATE_VALUES,
  PND_MANAGED_WATCH_WORKFLOW_IDS,
  PND_WATCH_ATTACK_DISCOVERY_GENERATION_WORKFLOW,
  PND_WATCH_ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
} from '.';

interface ParsedTrigger {
  type: string;
  with?: { every?: string };
  inputs?: {
    properties?: Record<string, { type?: string }>;
    additionalProperties?: boolean;
  };
}

interface ParsedStep {
  name: string;
  type: string;
  status?: string;
  timeout?: string;
  with?: Record<string, unknown>;
}

interface ParsedWorkflow {
  enabled?: boolean;
  tags?: string[];
  settings?: { concurrency?: { key?: string; strategy?: string; max?: number } };
  consts?: {
    watch_policy?: {
      settingsVersion?: number;
      autonomy?: string;
      config?: { adAlertSize?: number; adLookback?: string; adConnectorId?: string };
    };
  };
  triggers?: ParsedTrigger[];
  steps?: ParsedStep[];
}

/** Matches the `__SCREAMING_SNAKE__` placeholders that yamlTemplate definitions substitute. */
const UNREPLACED_TOKEN_PATTERN = /__[A-Z][A-Z0-9_]*__/g;

const renderYaml = (values = PND_AD_GENERATION_TEMPLATE_VALUES): string =>
  PND_WATCH_ATTACK_DISCOVERY_GENERATION_WORKFLOW.yamlTemplate(values);

const parsed = parse(renderYaml()) as ParsedWorkflow;

const getStep = (name: string): ParsedStep => {
  const step = (parsed.steps ?? []).find((s) => s.name === name);
  if (!step) {
    throw new Error(`No '${name}' step found in the Attack Discovery Generation workflow`);
  }
  return step;
};

// The generation worker is a per-space catalog watch: dynamic (installed from the
// catalog, not at boot), restorable, versionStrategy auto — matching the other
// watches so the reconciler treats them uniformly.
describe('watch_attack_discovery_generation definition wiring', () => {
  it('registers under the per-space catalog watch id', () => {
    expect(PND_WATCH_ATTACK_DISCOVERY_GENERATION_WORKFLOW.id).toBe(
      'system-security-watch-attack-discovery-generation'
    );
  });

  it('is a dynamic catalog watch, not a boot-installed helper', () => {
    expect(PND_WATCH_ATTACK_DISCOVERY_GENERATION_WORKFLOW.management).toEqual({
      enablement: 'restorable',
      lifecycle: 'dynamic',
      versionStrategy: 'auto',
    });
  });

  it('is listed among the catalog watches', () => {
    expect(PND_MANAGED_WATCH_WORKFLOW_IDS).toContain(
      PND_WATCH_ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID
    );
  });

  it('starts at version 1', () => {
    expect(PND_WATCH_ATTACK_DISCOVERY_GENERATION_WORKFLOW.version).toBe(1);
  });

  // Installed disabled: the catalog install enables it explicitly, and a schedule
  // that starts firing at install time would generate before anyone configured it.
  it('installs disabled', () => {
    expect(parsed.enabled).toBe(false);
  });

  it('carries the watch tag pair the catalog keys on', () => {
    expect(parsed.tags).toEqual(['watch', 'watch-attack-discovery-generation']);
  });
});

// Schedule cadence and generation options are template values, so the watch
// settings page can rewrite them without a YAML edit. The defaults are what the
// plugin installs with; every placeholder must be replaced by them.
describe('watch_attack_discovery_generation template values', () => {
  it('renders cleanly with the exported defaults, leaving no placeholder behind', () => {
    expect(renderYaml().match(UNREPLACED_TOKEN_PATTERN) ?? []).toEqual([]);
  });

  it('defaults to a 15-minute cadence over the last 24h of alerts', () => {
    expect(PND_AD_GENERATION_TEMPLATE_VALUES).toEqual({
      settingsVersion: 1,
      autonomyLevel: 'manual',
      scheduleEvery: '15m',
      alertSize: 100,
      lookback: 'now-24h',
      connectorId: '',
    });
  });

  it('writes the settings version and autonomy into the persisted policy', () => {
    expect(parsed.consts?.watch_policy?.settingsVersion).toBe(1);
    expect(parsed.consts?.watch_policy?.autonomy).toBe('manual');
  });

  it('writes the generation options into the policy config', () => {
    expect(parsed.consts?.watch_policy?.config).toEqual({
      adAlertSize: 100,
      adLookback: 'now-24h',
      adConnectorId: '',
    });
  });

  it('routes each template value to its own placeholder', () => {
    const rendered = parse(
      renderYaml({
        settingsVersion: 7,
        autonomyLevel: 'supervised',
        scheduleEvery: '30m',
        alertSize: 250,
        lookback: 'now-7d',
        connectorId: 'my-connector',
      })
    ) as ParsedWorkflow;

    expect((rendered.triggers ?? []).find(({ type }) => type === 'scheduled')?.with?.every).toBe(
      '30m'
    );
    expect(rendered.consts?.watch_policy?.settingsVersion).toBe(7);
    expect(rendered.consts?.watch_policy?.autonomy).toBe('supervised');
    expect(rendered.consts?.watch_policy?.config).toEqual({
      adAlertSize: 250,
      adLookback: 'now-7d',
      adConnectorId: 'my-connector',
    });
  });
});

// Schedule-driven, not signal-driven: this worker only generates. Each net-new
// persisted discovery emits security.attackDiscoveryCreated, which wakes the Watch
// Floor — so this watch must never itself subscribe to that event, or the loop
// guard the split exists to satisfy would be defeated.
describe('watch_attack_discovery_generation triggers', () => {
  it('runs on a schedule whose interval is the template cadence', () => {
    expect((parsed.triggers ?? []).find(({ type }) => type === 'scheduled')?.with?.every).toBe(
      '15m'
    );
  });

  it('stays manually runnable, so a run can be exercised without waiting a tick', () => {
    expect((parsed.triggers ?? []).map(({ type }) => type)).toContain('manual');
  });

  it('declares no third trigger', () => {
    expect(parsed.triggers).toHaveLength(2);
  });

  it('never subscribes to the event its own persist step emits', () => {
    expect((parsed.triggers ?? []).map(({ type }) => type)).not.toContain(
      'security.attackDiscoveryCreated'
    );
  });

  it('closes the manual trigger inputs to the four generation overrides', () => {
    const manual = (parsed.triggers ?? []).find(({ type }) => type === 'manual');

    expect(Object.keys(manual?.inputs?.properties ?? {}).sort()).toEqual([
      'connector_id',
      'end',
      'size',
      'start',
    ]);
    expect(manual?.inputs?.additionalProperties).toBe(false);
  });
});

// Overlapping scheduled ticks would stack redundant AD generations, so a new run
// is dropped while one is already in flight.
describe('watch_attack_discovery_generation concurrency', () => {
  it('serialises on a stable key', () => {
    expect(parsed.settings?.concurrency?.key).toBe('watch-attack-discovery-generation');
  });

  it('drops rather than queues an overlapping run', () => {
    expect(parsed.settings?.concurrency?.strategy).toBe('drop');
  });

  it('allows exactly one run in flight', () => {
    expect(parsed.settings?.concurrency?.max).toBe(1);
  });
});

describe('watch_attack_discovery_generation steps', () => {
  it('is exactly the run step and its terminal marker, in that order', () => {
    expect((parsed.steps ?? []).map(({ name }) => name)).toEqual([
      'run_attack_discovery',
      'emit_result',
    ]);
  });

  describe('run_attack_discovery', () => {
    const step = getStep('run_attack_discovery');

    it('runs the full generation pipeline through the discoveries connector', () => {
      expect(step.type).toBe('security.attack-discovery.run');
    });

    // Sync mode blocks until the run is terminal; generation regularly outlives
    // the default step timeout.
    it('allows ten minutes for a synchronous generation run', () => {
      expect(step.timeout).toBe('10m');
    });

    it('lets a manual connector override win over the configured template value', () => {
      expect(step.with?.connector_id).toBe(
        '{{ inputs.connector_id | default: consts.watch_policy.config.adConnectorId }}'
      );
    });

    it('defaults the alert budget from the policy config', () => {
      expect(step.with?.size).toBe(
        '${{ inputs.size | default: consts.watch_policy.config.adAlertSize }}'
      );
    });

    it('defaults the retrieval window start to the configured lookback', () => {
      expect(step.with?.start).toBe(
        '{{ inputs.start | default: consts.watch_policy.config.adLookback }}'
      );
    });

    it('defaults the retrieval window end to now', () => {
      expect(step.with?.end).toBe("{{ inputs.end | default: 'now' }}");
    });
  });

  describe('emit_result', () => {
    const step = getStep('emit_result');

    it('terminates the run as a workflow output', () => {
      expect(step.type).toBe('workflow.output');
    });

    it('ends the run as completed', () => {
      expect(step.status).toBe('completed');
    });

    it('carries the generation outcome for the runs table', () => {
      expect(Object.keys(step.with ?? {}).sort()).toEqual([
        'discovery_count',
        'execution_uuid',
        'status',
      ]);
    });
  });
});
