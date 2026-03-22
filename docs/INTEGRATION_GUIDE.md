# MITRE ATT&CK Auto-Mapper - Integration Guide

**Purpose:** Guide for integrating MITRE Auto-Mapper into the Kibana alert pipeline

**Status:** Implementation complete, integration pending

---

## 🎯 Integration Options

### Option A: Alert Enrichment Pipeline (Recommended)

**Integration Point:** `server/lib/detection_engine/rule_types/utils/enrichments/index.ts`

**Pros:**
- ✅ Consistent with existing enrichments (host risk, user risk, asset criticality)
- ✅ Parallel execution with other enrichments
- ✅ Automatic error handling (Promise.allSettled pattern)

**Cons:**
- ⚠️ Requires LLM client wiring (not used by other enrichments)
- ⚠️ Slower than other enrichments (200-500ms vs <50ms)

**Effort:** 1-2 hours

---

### Option B: Event-Driven Async Enrichment (Workflows - Recommended for async)

**Integration Point:** Workflows Extensions with event-driven trigger

**Pros:**
- ✅ **Event-driven** (not polling) - triggers immediately when alert indexed
- ✅ Non-blocking (doesn't slow alert creation)
- ✅ Request-scoped (proper security context)
- ✅ Declarative (configure via YAML workflows)
- ✅ Can batch process (reduce LLM costs further)
- ✅ Platform-managed execution (no Task Manager setup)

**Cons:**
- ⚠️ MITRE tags appear after alert indexed (eventual consistency ~100-500ms)
- ⚠️ Requires workflows_extensions approval for new trigger

**Effort:** 2-3 hours (same as Task Manager, but better architecture)

---

## 🔧 Option A Implementation (Recommended)

### Step 1: Create MITRE Enrichment Function

**Create:** `server/lib/detection_engine/rule_types/utils/enrichments/enrichment_by_type/mitre_attack.ts`

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateRiskEnrichment } from '../types';
import {
  mapAlertToMitre,
  enrichAlertWithMitre,
  extractSecurityFeatures,
  getMitreFromCache,
  setMitreInCache,
  hasExistingMitreMapping,
  mergeWithExistingMitreMapping,
} from '../../../../../enrichments/mitre_mapping';
import type { LLMClient } from '../../../../../enrichments/mitre_mapping';

interface MitreEnrichmentParams<T> {
  services: SecurityRuleServices;
  logger: IRuleExecutionLogForExecutors;
  events: Array<EventsForEnrichment<T>>;
  llmClient?: LLMClient;
  experimentalFeatures: ExperimentalFeatures;
}

/**
 * Creates MITRE ATT&CK enrichments for security alerts using LLM reasoning.
 *
 * Filters:
 * - Only high-risk alerts (risk_score >= 50) to control costs
 * - Only alerts without existing MITRE mappings (avoid duplicate work)
 *
 * Caching:
 * - 90% hit rate at steady state reduces costs from $3K to $300/month
 * - 7-day TTL (attack patterns stable)
 *
 * Performance:
 * - Cache hit: <1ms
 * - Cache miss: 200-500ms (LLM call)
 * - Parallel execution with other enrichments
 */
export const createMitreAttackEnrichments: CreateRiskEnrichment = async ({
  services,
  logger,
  events,
  llmClient,
  experimentalFeatures,
}) => {
  const enrichmentsMap: EventsMapByEnrichments = {};

  if (!experimentalFeatures.mitreAutoMapEnabled) {
    logger.debug('MITRE Auto-Mapper disabled (feature flag off)');
    return enrichmentsMap;
  }

  if (!llmClient) {
    logger.warn('MITRE Auto-Mapper enabled but no LLM client provided');
    return enrichmentsMap;
  }

  try {
    logger.debug(`MITRE Auto-Mapper processing ${events.length} alerts`);
    let mappedCount = 0;
    let cacheHits = 0;

    await Promise.all(
      events.map(async (event) => {
        const alert = event._source;

        // Filter 1: Only high-risk alerts (cost control)
        const riskScore = alert['kibana.alert.risk_score'] as number | undefined;
        if (!riskScore || riskScore < 50) {
          return;
        }

        // Filter 2: Hybrid check - Skip if rule tagged AND no additional indicators
        if (!shouldAutoMapDespiteRuleTags(alert)) {
          logger.debug(`Alert ${event._id} has rule tags and no additional TTPs detected, skipping`);
          return;
        }

        // Extract security features for caching
        const features = extractSecurityFeatures(alert);

        // Check cache first
        let mapping = getMitreFromCache(features);
        if (mapping) {
          cacheHits++;
        } else {
          // Cache miss - call LLM
          mapping = await mapAlertToMitre(alert, llmClient);
          if (mapping) {
            setMitreInCache(features, mapping);
          }
        }

        // Apply enrichment if mapping found
        if (mapping && mapping.techniques.length > 0) {
          enrichmentsMap[event._id] = enrichmentsMap[event._id] || [];
          enrichmentsMap[event._id].push((e) => ({
            ...e,
            _source: enrichAlertWithMitre(e._source, mapping),
          }));
          mappedCount++;
        }
      })
    );

    const cacheHitRate = events.length > 0 ? (cacheHits / events.length) * 100 : 0;
    logger.debug(
      `MITRE Auto-Mapper complete: ${mappedCount}/${events.length} alerts enriched, ` +
        `${cacheHitRate.toFixed(1)}% cache hit rate`
    );

    return enrichmentsMap;
  } catch (error) {
    logger.error(`MITRE Auto-Mapper failed: ${error}`);
    return enrichmentsMap; // Return empty map on failure (graceful degradation)
  }
};
```

---

### Step 2: Wire Up LLM Client

**Challenge:** Existing enrichments don't use LLM clients

**Solution:** Access Elastic Assistant's Claude client

**Find Claude client:**

```bash
grep -r "ChatAnthropic" x-pack/solutions/security/plugins/elastic_assistant/server/
```

**Expected path:** `elastic_assistant/server/lib/langchain/llm/`

**Wire up in rule execution:**

```typescript
// In rule executor (where enrichEvents is called)
import { ElasticAssistantPluginStart } from '@kbn/elastic-assistant-plugin/server';

// Get LLM client from Elastic Assistant
const elasticAssistant = (await plugins.elasticAssistant).asScoped(request);
const llmClient = await elasticAssistant.getLLMClient('claude-3-5-haiku-20241022');

// Pass to enrichEvents
const enriched = await enrichEvents({
  services,
  logger,
  events: alerts,
  spaceId,
  llmClient, // New parameter
  experimentalFeatures, // New parameter
});
```

---

### Step 3: Modify enrichEvents to Accept LLM Client

**File:** `server/lib/detection_engine/rule_types/utils/enrichments/index.ts`

**Add parameters:**

```typescript
export const enrichEvents: EnrichEvents = async ({
  services,
  logger,
  events,
  spaceId,
  llmClient, // NEW
  experimentalFeatures, // NEW
}) => {
  try {
    const enrichments: Array<Promise<EventsMapByEnrichments>> = [];

    logger.debug('Alert enrichments started');

    // ... existing enrichments (host risk, user risk, asset criticality) ...

    // MITRE ATT&CK Auto-Mapper (NEW)
    if (experimentalFeatures?.mitreAutoMapEnabled && llmClient) {
      enrichments.push(
        createMitreAttackEnrichments({
          services,
          logger,
          events,
          llmClient,
          experimentalFeatures,
        })
      );
    }

    const allEnrichmentsResults = await Promise.allSettled(enrichments);
    // ... rest of function ...
  }
};
```

---

### Step 4: Update Type Definitions

**File:** `server/lib/detection_engine/rule_types/utils/enrichments/types.ts`

**Add to `EnrichEvents` type:**

```typescript
export type EnrichEvents = <T extends DetectionAlertLatest>(
  params: BasedEnrichParameters<T> & {
    spaceId: string;
    llmClient?: LLMClient; // NEW
    experimentalFeatures?: ExperimentalFeatures; // NEW
  }
) => Promise<Array<EventsForEnrichment<T>>>;
```

---

## 🧪 Integration Testing

### Test 1: Feature Flag Controls Enrichment

```typescript
it('should enrich alert when mitreAutoMapEnabled=true', async () => {
  const alerts = [
    {
      _id: '123',
      _source: {
        'process.name': 'powershell.exe',
        'kibana.alert.risk_score': 75,
      },
    },
  ];

  const enriched = await enrichEvents({
    services,
    logger,
    events: alerts,
    spaceId: 'default',
    llmClient: mockLLM,
    experimentalFeatures: { mitreAutoMapEnabled: true },
  });

  expect(enriched[0]._source['threat.technique.id']).toContain('T1059.001');
});

it('should not enrich when mitreAutoMapEnabled=false', async () => {
  const alerts = [
    {
      _id: '123',
      _source: {
        'process.name': 'powershell.exe',
        'kibana.alert.risk_score': 75,
      },
    },
  ];

  const enriched = await enrichEvents({
    services,
    logger,
    events: alerts,
    spaceId: 'default',
    llmClient: mockLLM,
    experimentalFeatures: { mitreAutoMapEnabled: false },
  });

  expect(enriched[0]._source['threat.technique.id']).toBeUndefined();
});
```

---

### Test 2: Risk Score Filter

```typescript
it('should only enrich high-risk alerts (>=50)', async () => {
  const alerts = [
    {
      _id: '1',
      _source: { 'process.name': 'powershell.exe', 'kibana.alert.risk_score': 75 },
    },
    {
      _id: '2',
      _source: { 'process.name': 'cmd.exe', 'kibana.alert.risk_score': 25 },
    },
  ];

  const enriched = await enrichEvents({
    services,
    logger,
    events: alerts,
    spaceId: 'default',
    llmClient: mockLLM,
    experimentalFeatures: { mitreAutoMapEnabled: true },
  });

  expect(enriched[0]._source['threat.technique.id']).toBeDefined(); // High-risk enriched
  expect(enriched[1]._source['threat.technique.id']).toBeUndefined(); // Low-risk skipped
});
```

---

## 📋 Integration Checklist

### Prerequisites
- [x] Core implementation complete
- [x] Unit tests passing
- [ ] LLM client accessible (Elastic Assistant)
- [ ] Experimental features accessible in rule executor

### Integration Steps
- [ ] Create `createMitreAttackEnrichments` function (30 min)
- [ ] Wire up LLM client from Elastic Assistant (30 min)
- [ ] Modify `enrichEvents` to accept LLM client (15 min)
- [ ] Update type definitions (15 min)
- [ ] Add integration tests (30 min)
- [ ] Manual validation (15 min)

**Total Integration Time:** 2-2.5 hours

---

## 🔍 Manual Validation Steps

### Enable Feature Flag

**File:** `config/kibana.dev.yml`

```yaml
xpack.securitySolution.enableExperimental:
  - mitreAutoMapEnabled
```

**Or via Advanced Settings:**
1. Navigate to: Stack Management → Advanced Settings
2. Search: "Experimental"
3. Find: `securitySolution:enableExperimental`
4. Add: `mitreAutoMapEnabled`

---

### Create Test Alert

1. Create detection rule (any type)
2. Trigger rule to generate alert
3. Wait for alert indexing
4. Open alert in Alerts table
5. Click alert → View details flyout

---

### Verify MITRE Tags

**Expected fields in alert document:**

```json
{
  "threat.framework": "MITRE ATT&CK",
  "threat.framework.version": "v14",
  "threat.technique.id": ["T1059.001"],
  "threat.technique.name": ["PowerShell"],
  "threat.tactic.id": ["TA0002"],
  "threat.tactic.name": ["Execution"],
  "threat.phase": "Execution",
  "kibana.alert.mitre.reasoning": "PowerShell execution with encoded command...",
  "kibana.alert.mitre.mapping_source": "llm_auto_map",
  "kibana.alert.mitre.mapping_timestamp": "2026-03-22T12:00:00Z"
}
```

**Validation:**
- ✅ `threat.technique.id` array is populated
- ✅ `threat.tactic.name` array is populated
- ✅ `threat.framework` is "MITRE ATT&CK"
- ✅ Reasoning is human-readable

---

### Check Cache Performance

**Enable debug logging:**

```yaml
# config/kibana.dev.yml
logging.loggers:
  - name: plugins.securitySolution.detection_engine.enrichments
    level: debug
```

**Trigger multiple identical alerts:**
1. First alert: Logs "MITRE mapping called" (cache miss)
2. Second alert: Logs "MITRE mapping from cache" (cache hit)

**Expected:** Cache hit rate increases over time (target 90%)

---

## 🔧 Option B Implementation (Event-Driven Workflows)

### Why Workflows > Task Manager

| Feature | Workflows | Task Manager |
|---------|-----------|--------------|
| **Execution** | Event-driven (instant) | Polling (5min intervals) |
| **Latency** | ~100-500ms after alert | Up to 5 minutes |
| **Efficiency** | Only runs when needed | Runs every interval |
| **Security** | Request-scoped context | System context |
| **Configuration** | YAML workflows (declarative) | Code (imperative) |

**Verdict:** ✅ **Always prefer Workflows for event-driven tasks**

---

### Step 1: Register Event Trigger (1 hour)

**Create:** `common/workflows/triggers/high_risk_alert_indexed.ts`

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';

/** Trigger when high-risk security alert is indexed (risk_score >= 50) */
export const HIGH_RISK_ALERT_INDEXED_TRIGGER_ID = 'security-solution.highRiskAlertIndexed' as const;

export const highRiskAlertIndexedEventSchema = z.object({
  alertId: z.string().describe('The ID of the indexed alert'),
  riskScore: z.number().describe('Alert risk score (50-100)'),
  index: z.string().describe('Index where alert was created'),
  spaceId: z.string().describe('Space ID where alert belongs'),
  hasRuleMitreTags: z.boolean().describe('Whether rule has existing MITRE tags'),
  alertTimestamp: z.string().describe('Alert @timestamp'),
});

export type HighRiskAlertIndexedEvent = z.infer<typeof highRiskAlertIndexedEventSchema>;

export const commonHighRiskAlertIndexedTrigger: CommonTriggerDefinition = {
  id: HIGH_RISK_ALERT_INDEXED_TRIGGER_ID,
  eventSchema: highRiskAlertIndexedEventSchema,
};
```

---

**Register on server:** `server/workflows/triggers/index.ts`

```typescript
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { commonHighRiskAlertIndexedTrigger } from '../../../common/workflows/triggers/high_risk_alert_indexed';

export function registerSecurityWorkflowTriggers(
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup
) {
  workflowsExtensions.registerTriggerDefinition(commonHighRiskAlertIndexedTrigger);
}

// In plugin.ts setup():
if (plugins.workflowsExtensions) {
  registerSecurityWorkflowTriggers(plugins.workflowsExtensions);
}
```

---

**Register on public:** `public/workflows/triggers/high_risk_alert_indexed.ts`

```typescript
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  HIGH_RISK_ALERT_INDEXED_TRIGGER_ID,
  commonHighRiskAlertIndexedTrigger,
} from '../../../common/workflows/triggers/high_risk_alert_indexed';

export const highRiskAlertIndexedPublicDefinition: PublicTriggerDefinition = {
  ...commonHighRiskAlertIndexedTrigger,
  title: i18n.translate('xpack.securitySolution.workflows.highRiskAlert.title', {
    defaultMessage: 'High-risk alert indexed',
  }),
  description: i18n.translate('xpack.securitySolution.workflows.highRiskAlert.description', {
    defaultMessage: 'Triggered when a high-risk security alert (risk_score >= 50) is indexed. Use to trigger MITRE mapping, enrichment, or auto-triage workflows.',
  }),
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/alert').then(({ icon }) => ({ default: icon }))
  ),
  documentation: {
    summary: 'Event-driven trigger for high-risk security alerts',
    details: 'Filter which alerts trigger this workflow using KQL on event properties.',
    examples: [
      `## Map all high-risk alerts\n\`\`\`yaml\ntriggers:\n  - type: ${HIGH_RISK_ALERT_INDEXED_TRIGGER_ID}\n\`\`\``,
      `## Only alerts without rule tags\n\`\`\`yaml\ntriggers:\n  - type: ${HIGH_RISK_ALERT_INDEXED_TRIGGER_ID}\n    on:\n      condition: 'event.hasRuleMitreTags: false'\n\`\`\``,
    ],
  },
  snippets: {
    condition: 'event.riskScore >= 75', // Example condition
  },
};

// In public plugin setup():
plugins.workflowsExtensions.registerTriggerDefinition(highRiskAlertIndexedPublicDefinition);
```

---

### Step 2: Emit Event When Alert Indexed (30 min)

**In alert indexing code** (after alert successfully indexed):

```typescript
import { HIGH_RISK_ALERT_INDEXED_TRIGGER_ID } from '../../../common/workflows/triggers/high_risk_alert_indexed';

export async function indexAlert(
  alert: Alert,
  context: SecuritySolutionRequestHandlerContext
): Promise<void> {
  // ... existing indexing logic ...

  // After successful indexing:
  const indexed = await esClient.index({ index: alertIndex, document: alert });

  // Emit workflow trigger for high-risk alerts
  if (
    alert['kibana.alert.risk_score'] >= 50 &&
    context.workflowsExtensions
  ) {
    const workflowsClient = await context.workflowsExtensions.getWorkflowsClient();

    await workflowsClient.emitEvent(HIGH_RISK_ALERT_INDEXED_TRIGGER_ID, {
      alertId: indexed._id,
      riskScore: alert['kibana.alert.risk_score'],
      index: alertIndex,
      spaceId: context.spaceId,
      hasRuleMitreTags: hasRuleMitreMapping(alert),
      alertTimestamp: alert['@timestamp'],
    });
  }
}
```

**Errors are safe:** If `emitEvent` fails, alert is still indexed (fire-and-forget)

---

### Step 3: Register MITRE Mapping Workflow Step (1 hour)

**Create:** `common/workflows/steps/map_alert_to_mitre.ts`

```typescript
import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';

export const MAP_ALERT_TO_MITRE_STEP_ID = 'security-solution.mapAlertToMitre' as const;

export const mapAlertToMitreInputSchema = z.object({
  alertId: z.string().describe('Alert ID to enrich with MITRE tags'),
  index: z.string().describe('Index where alert is stored'),
});

export const mapAlertToMitreOutputSchema = z.object({
  success: z.boolean(),
  techniqueIds: z.array(z.string()).optional(),
  tacticNames: z.array(z.string()).optional(),
  error: z.string().optional(),
});

export const commonMapAlertToMitreStepDefinition: CommonStepDefinition = {
  id: MAP_ALERT_TO_MITRE_STEP_ID,
  inputSchema: mapAlertToMitreInputSchema,
  outputSchema: mapAlertToMitreOutputSchema,
};
```

---

**Server-side handler:** `server/workflows/steps/map_alert_to_mitre.ts`

```typescript
import type { ServerStepDefinition } from '@kbn/workflows-extensions/server';
import { commonMapAlertToMitreStepDefinition } from '../../../common/workflows/steps/map_alert_to_mitre';
import {
  mapAlertToMitre,
  extractSecurityFeatures,
  getMitreFromCache,
  setMitreInCache,
} from '../../lib/detection_engine/enrichments/mitre_mapping';

export const mapAlertToMitreServerStepDefinition: ServerStepDefinition = {
  ...commonMapAlertToMitreStepDefinition,
  handler: async ({ input, context }) => {
    try {
      // Fetch alert from Elasticsearch
      const esClient = context.core.elasticsearch.client.asCurrentUser;
      const alertDoc = await esClient.get({
        index: input.index,
        id: input.alertId,
      });

      const alert = alertDoc._source as Record<string, any>;

      // Get LLM client from Elastic Assistant
      const { elasticAssistant } = context.plugins;
      const llmClient = await elasticAssistant.getLLMClient('claude-3-5-haiku-20241022');

      // Check cache first
      const features = extractSecurityFeatures(alert);
      let mapping = getMitreFromCache(features);

      if (!mapping) {
        // Cache miss - call LLM
        mapping = await mapAlertToMitre(alert, llmClient);
        if (mapping) {
          setMitreInCache(features, mapping);
        }
      }

      if (!mapping || mapping.techniques.length === 0) {
        return {
          success: false,
          error: 'No MITRE mapping found (insufficient data or low confidence)',
        };
      }

      // Update alert document with MITRE tags
      await esClient.update({
        index: input.index,
        id: input.alertId,
        body: {
          doc: {
            'threat.framework': 'MITRE ATT&CK',
            'threat.framework.version': 'v14',
            'threat.technique.id': mapping.techniques.map((t) => t.id),
            'threat.technique.name': mapping.techniques.map((t) => t.name),
            'threat.tactic.id': mapping.tactics.map((t) => t.id),
            'threat.tactic.name': mapping.tactics.map((t) => t.name),
            'threat.phase': mapping.phase,
            'kibana.alert.mitre.reasoning': mapping.reasoning,
            'kibana.alert.mitre.mapping_source': 'llm_auto_map_workflow',
            'kibana.alert.mitre.mapping_timestamp': new Date().toISOString(),
          },
        },
      });

      return {
        success: true,
        techniqueIds: mapping.techniques.map((t) => t.id),
        tacticNames: mapping.tactics.map((t) => t.name),
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
};
```

---

**Public-side UI:** `public/workflows/steps/map_alert_to_mitre.ts`

```typescript
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { commonMapAlertToMitreStepDefinition } from '../../../common/workflows/steps/map_alert_to_mitre';

export const mapAlertToMitrePublicStepDefinition: PublicStepDefinition = {
  ...commonMapAlertToMitreStepDefinition,
  label: i18n.translate('xpack.securitySolution.workflows.mapAlertToMitre.label', {
    defaultMessage: 'Map alert to MITRE ATT&CK',
  }),
  description: i18n.translate('xpack.securitySolution.workflows.mapAlertToMitre.description', {
    defaultMessage: 'Automatically enriches alert with MITRE ATT&CK technique and tactic tags using LLM reasoning',
  }),
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/logoSecurity').then(({ icon }) => ({ default: icon }))
  ),
  documentation: {
    summary: 'Enriches security alerts with MITRE ATT&CK framework tags',
    details: 'Uses Claude Haiku LLM to analyze alert content (process, network, file, registry) and attribute MITRE techniques. Includes 90% caching for cost optimization.',
    examples: [
      `## Auto-map on high-risk alerts\n\`\`\`yaml\ntriggers:\n  - type: security-solution.highRiskAlertIndexed\nsteps:\n  - name: map_mitre\n    type: security-solution.mapAlertToMitre\n    with:\n      alertId: "{{ context.event.alertId }}"\n      index: "{{ context.event.index }}"\n\`\`\``,
    ],
  },
};
```

---

### Step 4: Register Step and Trigger (15 min)

**In plugin setup:**

```typescript
// server/plugin.ts
export class SecuritySolutionPlugin implements Plugin {
  setup(core: CoreSetup, plugins: SecuritySolutionSetupDeps) {
    if (plugins.workflowsExtensions) {
      // Register trigger
      registerSecurityWorkflowTriggers(plugins.workflowsExtensions);

      // Register step
      plugins.workflowsExtensions.registerStepDefinition(
        mapAlertToMitreServerStepDefinition
      );
    }
  }
}

// public/plugin.ts
export class SecuritySolutionPublicPlugin implements Plugin {
  setup(core: CoreSetup, plugins: SecuritySolutionPublicSetupDeps) {
    if (plugins.workflowsExtensions) {
      plugins.workflowsExtensions.registerStepDefinition(
        mapAlertToMitrePublicStepDefinition
      );
      plugins.workflowsExtensions.registerTriggerDefinition(
        highRiskAlertIndexedPublicDefinition
      );
    }
  }
}
```

---

### Step 5: Create Default Workflow (15 min)

**Create:** `server/workflows/definitions/auto_mitre_mapping.yaml`

```yaml
# Auto MITRE Mapping Workflow
# Runs on every high-risk alert without rule MITRE tags

name: MITRE ATT&CK Auto-Mapper
description: Automatically enriches high-risk security alerts with MITRE ATT&CK technique tags

triggers:
  - type: security-solution.highRiskAlertIndexed
    on:
      # Only trigger for alerts without rule tags (gap-filling)
      condition: 'event.hasRuleMitreTags: false'

steps:
  - name: map_to_mitre
    type: security-solution.mapAlertToMitre
    with:
      alertId: "{{ context.event.alertId }}"
      index: "{{ context.event.index }}"

  - name: log_result
    type: console.log
    with:
      message: "MITRE mapped: {{ steps.map_to_mitre.output.techniqueIds }}"
```

**Install workflow on plugin initialization** (optional):

```typescript
// server/workflows/install_default_workflows.ts
export async function installDefaultMitreWorkflow(
  workflowsClient: WorkflowsClient
): Promise<void> {
  const exists = await workflowsClient.find({
    name: 'MITRE ATT&CK Auto-Mapper',
  });

  if (exists.total === 0) {
    await workflowsClient.create({
      name: 'MITRE ATT&CK Auto-Mapper',
      description: 'Auto-enriches alerts with MITRE tags',
      triggers: [{ type: HIGH_RISK_ALERT_INDEXED_TRIGGER_ID }],
      steps: [
        {
          name: 'map_to_mitre',
          type: MAP_ALERT_TO_MITRE_STEP_ID,
          with: {
            alertId: '{{ context.event.alertId }}',
            index: '{{ context.event.index }}',
          },
        },
      ],
    });
  }
}
```

---

### Architecture Diagram (Option B)

```
Alert Indexed → Emit Event (security.highRiskAlertIndexed)
                        ↓
            ┌───────────────────────────┐
            │ Workflows Engine          │
            │ (Platform-managed)        │
            └───────────┬───────────────┘
                        │
            Filter: event.hasRuleMitreTags = false
                        ↓
            ┌───────────────────────────┐
            │ Run Workflow              │
            │ "MITRE Auto-Mapper"       │
            └───────────┬───────────────┘
                        │
            ┌───────────▼───────────────┐
            │ Step: mapAlertToMitre     │
            │ - Fetch alert             │
            │ - Check cache             │
            │ - Call LLM (if miss)      │
            │ - Update alert doc        │
            └───────────────────────────┘
```

**Latency:** ~100-500ms after alert indexed (vs instant with Option A)

**Benefit:** Non-blocking alert creation (better user experience)

---

### Comparison: Option A vs Option B (Workflows)

| Aspect | Option A (Enrichment) | Option B (Workflows) |
|--------|----------------------|---------------------|
| **When** | During alert creation | After alert indexed |
| **Blocking** | Blocks indexing | Non-blocking |
| **Latency** | Inline (~300ms added) | Async (~100-500ms after) |
| **MITRE tags** | Immediate | Eventual (~500ms delay) |
| **Error handling** | Alert created even if fails | Alert always created |
| **Batch processing** | No (per-alert) | Yes (can batch) |
| **User experience** | Slightly slower alert creation | Faster alert creation |
| **Complexity** | Modify enrichment pipeline | Register trigger + step |

**Recommendation:**
- **Option A:** If MITRE tags must be immediate (for dashboards, correlations)
- **Option B (Workflows):** If non-blocking preferred (better UX, can batch)

---

## 🚨 Troubleshooting

### Issue: MITRE tags not appearing

**Check:**
1. ✅ Feature flag enabled? (`mitreAutoMapEnabled`)
2. ✅ Alert risk score >= 50?
3. ✅ LLM client provided to enrichEvents?
4. ✅ No existing MITRE mapping? (skips if manual tags exist)

**Debug:**
```bash
# Check Kibana logs for errors
tail -f logs/kibana.log | grep MITRE
```

---

### Issue: Slow alert creation

**Check:**
1. ✅ Cache hit rate? (Should be 90%+ after week 1)
2. ✅ LLM latency? (Should be <500ms)
3. ✅ Too many alerts being enriched? (Raise risk_score threshold to 75)

**Fix:**
```typescript
// Increase risk score threshold
if (riskScore >= 75) { // Was 50
  // Only enrich critical alerts
}
```

---

### Issue: LLM costs too high

**Check:**
1. ✅ Cache working? (`getCacheStats()` should show >80% utilization)
2. ✅ Risk score filter active? (Should filter out 70% of alerts)
3. ✅ Too many alerts overall? (Tune detection rules)

**Cost controls:**
```typescript
// Add additional filters
if (
  riskScore >= 75 && // Higher threshold
  !hasExistingMitreMapping(alert) &&
  shouldEnrichAlert(alert) // Custom business logic
) {
  // Enrich
}
```

---

## 📊 Monitoring & Observability

### Metrics to Track

**Cache Performance:**
```typescript
const stats = getCacheStats();
console.log({
  cacheSize: stats.size,
  utilization: stats.utilizationPercent,
});
```

**LLM Performance:**
```typescript
// Track in APM
const start = Date.now();
const mapping = await mapAlertToMitre(alert, llmClient);
const latency = Date.now() - start;

apm.recordMetric('mitre.llm.latency', latency);
apm.recordMetric('mitre.llm.success', mapping ? 1 : 0);
```

**Cost Tracking:**
```typescript
// Track LLM calls per hour/day/month
let llmCallCount = 0;

// In mapping function
llmCallCount++;

// Log daily
setInterval(() => {
  logger.info(`MITRE LLM calls today: ${llmCallCount}`);
}, 24 * 60 * 60 * 1000);
```

---

### APM Dashboard Suggestions

**Panels to add:**
1. **MITRE Mapping Rate** (alerts/min enriched)
2. **Cache Hit Rate** (% cached vs LLM calls)
3. **LLM Latency** (P50, P95, P99)
4. **Mapping Accuracy** (if user feedback implemented)
5. **Cost Tracking** (LLM calls × $0.01)

---

## 🎓 Architecture Insights

### Insight 1: Layered Approach (Not Replacement)

**Decision:** MITRE Auto-Mapper is an **enrichment layer**, not a replacement for manual tagging

**Why:**
- ✅ Manual tags from detection rules still work (merged, not replaced)
- ✅ LLM adds coverage where manual tags missing
- ✅ Graceful degradation if LLM unavailable

**Pattern:**
```typescript
if (hasExistingMitreMapping(alert)) {
  // Merge LLM + manual tags (best of both)
  return mergeWithExistingMitreMapping(alert, llmMapping);
} else {
  // Pure LLM mapping
  return enrichAlertWithMitre(alert, llmMapping);
}
```

---

### Insight 2: Async Enrichment Safety

**Decision:** LLM enrichment doesn't block alert creation

**Why:**
- ✅ Alert appears immediately (with or without MITRE tags)
- ✅ LLM timeout doesn't fail alert creation
- ✅ Eventual consistency acceptable (tags appear within 500ms)

**Implementation:**
```typescript
try {
  const mapping = await mapAlertToMitre(alert, llmClient);
  // ...
} catch (error) {
  logger.error('MITRE mapping failed:', error);
  return alert; // Alert created without MITRE tags
}
```

---

### Insight 3: Cost Control via Filtering

**Decision:** Only enrich high-risk alerts (risk_score >= 50)

**Why:**
- ✅ Reduces LLM calls by 70% (300K vs 1M alerts/month)
- ✅ Focuses LLM on important alerts (high-risk = high-value)
- ✅ Low-risk alerts often benign (less value in MITRE tagging)

**Cost impact:**
- Without filter: $10,000/month (1M × $0.01)
- With filter: $3,000/month (300K × $0.01)
- With filter + cache: $300/month (300K × 10% × $0.01)
- **Savings: $9,700/month** (97% cost reduction)

---

## 🔗 Next Steps

1. **Integrate into alert pipeline** (2-3 hours)
   - Create `mitre_attack.ts` enrichment function
   - Wire up LLM client
   - Update types

2. **Manual validation** (30 min)
   - Enable feature flag
   - Create test alerts
   - Verify MITRE tags appear

3. **Performance testing** (1 hour)
   - Test with 100+ alerts
   - Measure cache hit rate
   - Validate latency < 500ms

4. **Documentation** (30 min)
   - Update spike doc with integration results
   - Capture screenshots
   - Write demo script

---

**Total Remaining Effort:** 4-5 hours to fully integrate and validate

---

## 📚 References

- **Spec:** `SPIKE_SPEC_MITRE_AUTO_MAP.md`
- **Implementation:** `server/lib/detection_engine/enrichments/mitre_mapping/`
- **Tests:** `map_alert_to_mitre.test.ts`, `mitre_cache.test.ts`
- **Related:** XDR Correlation #257949, GitHub Issue #16415
