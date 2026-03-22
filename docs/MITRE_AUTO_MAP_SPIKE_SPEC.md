# MITRE ATT&CK Auto-Mapper - Spike Specification

**Author:** Patryk Kopycinski + Claude
**Date:** 2026-03-22
**Type:** Spike/PoC → Production-Ready
**Target:** 10.0 or 10.1 GA
**Effort:** 4-6 hours

---

## Problem Statement

**Current State:**
- Analysts manually tag alerts with MITRE ATT&CK techniques
- Time-consuming: 2-5 minutes per alert
- Inconsistent: Different analysts tag differently
- Incomplete: 60-70% of alerts never get MITRE tags

**Impact:**
- Can't use MITRE-based detection rules
- Can't generate ATT&CK Navigator heatmaps
- Compliance gaps (NIST CSF, MITRE Engenuity)
- Poor attack context ("what stage of attack is this?")

---

## Solution

**Autonomous MITRE ATT&CK Attribution using LLM**

**Input:** Any security alert (query, ML, threshold, correlation, etc.)
**Output:** Alert enriched with MITRE tags

```typescript
Alert Fields:
  process.name: "powershell.exe"
  process.command_line: "powershell -enc BASE64..."
  event.action: "process_start"
  ↓
LLM Mapper (Claude Haiku - fast & cheap):
  "This shows PowerShell execution with encoded command"
  → Technique: T1059.001 (PowerShell)
  → Tactic: TA0002 (Execution)
  → Phase: Execution
  ↓
Enriched Alert:
  kibana.alert.threat.framework: "MITRE ATT&CK v14"
  kibana.alert.threat.technique.id: ["T1059.001"]
  kibana.alert.threat.technique.name: ["PowerShell"]
  kibana.alert.threat.tactic.id: ["TA0002"]
  kibana.alert.threat.tactic.name: ["Execution"]
  kibana.alert.threat.phase: "Execution"
```

---

## Scope

### In Scope (Spike)

- ✅ LLM-powered MITRE mapping for common techniques
- ✅ Support for process, network, file, registry alerts
- ✅ Integration with Elastic Assistant (reuse Claude client)
- ✅ Async enrichment (doesn't block alert creation)
- ✅ Caching (same alert pattern → same MITRE tags)
- ✅ Feature flag (`mitreAutoMapEnabled`)
- ✅ Unit tests + integration tests

### Out of Scope (Production)

- ❌ All 700+ MITRE techniques (spike covers top 50)
- ❌ Sub-technique granularity (spike does technique-level only)
- ❌ Confidence scores (spike is binary: mapped or not)
- ❌ User feedback loop (RLHF - defer to 10.2)

---

## Architecture

### High-Level Flow

```
Alert Created (any rule type)
  ↓
Is MITRE auto-map enabled? → NO → Skip
  ↓ YES
Is alert.risk_score >= 50? → NO → Skip (low-risk)
  ↓ YES
Extract Key Fields:
  - process.name, process.command_line
  - network.protocol, network.direction
  - file.path, file.hash
  - registry.path, registry.value
  ↓
Check Cache:
  Key: hash(fields) → Cached MITRE tags? → YES → Return cached
  ↓ NO
Call LLM (Claude Haiku):
  Prompt: "Map this alert to MITRE ATT&CK..."
  Response: { techniques: [...], tactics: [...], phase: "..." }
  ↓
Cache Result (7-day TTL)
  ↓
Enrich Alert:
  kibana.alert.threat.* fields
  ↓
Index Alert (with MITRE tags)
```

---

## Implementation Plan

### Phase 1: Core Mapping Function (2 hours)

**File:** `server/lib/detection_engine/enrichments/mitre_mapping/map_alert_to_mitre.ts`

```typescript
export async function mapAlertToMitre(
  alert: Alert,
  llmClient: ChatAnthropic
): Promise<MitreMapping> {
  // Extract relevant fields
  const features = extractSecurityFeatures(alert);

  // Generate LLM prompt
  const prompt = buildMitrePrompt(features);

  // Call LLM
  const response = await llmClient.invoke([
    { role: 'user', content: prompt }
  ]);

  // Parse response
  const mapping = parseMitreResponse(response.content);

  return mapping;
}
```

---

### Phase 2: Integration with Alert Pipeline (1 hour)

**Integration Point:** Before alert indexing (in bulkCreate or earlier)

```typescript
// In alert creation pipeline:
if (experimentalFeatures.mitreAutoMapEnabled && alert.risk_score >= 50) {
  const mitreMapping = await mapAlertToMitre(alert, llmClient);
  alert = enrichAlertWithMitre(alert, mitreMapping);
}
```

---

### Phase 3: Caching Layer (30 min)

**File:** `server/lib/detection_engine/enrichments/mitre_mapping/mitre_cache.ts`

```typescript
const mitreCache = new Map<string, MitreMapping>();

function getCacheKey(alert: Alert): string {
  return hash({
    processName: alert['process.name'],
    eventAction: alert['event.action'],
    commandLine: alert['process.command_line'],
  });
}

export async function mapWithCache(
  alert: Alert,
  llmClient: ChatAnthropic
): Promise<MitreMapping> {
  const key = getCacheKey(alert);
  if (mitreCache.has(key)) return mitreCache.get(key)!;

  const mapping = await mapAlertToMitre(alert, llmClient);
  mitreCache.set(key, mapping);
  return mapping;
}
```

---

### Phase 4: Testing (1-2 hours)

**Unit Tests:**
```typescript
describe('mapAlertToMitre', () => {
  it('maps PowerShell execution to T1059.001', async () => {
    const alert = {
      'process.name': 'powershell.exe',
      'event.action': 'process_start',
    };
    const mapping = await mapAlertToMitre(alert, mockLLM);
    expect(mapping.techniques).toContain('T1059.001');
    expect(mapping.tactics).toContain('Execution');
  });

  it('caches identical alerts', async () => {
    const alert1 = { 'process.name': 'cmd.exe' };
    const alert2 = { 'process.name': 'cmd.exe' };

    await mapWithCache(alert1, mockLLM);
    await mapWithCache(alert2, mockLLM);

    expect(mockLLM.invoke).toHaveBeenCalledTimes(1); // Cached
  });
});
```

---

## Success Criteria

**Spike is complete when:**
1. ✅ MITRE mapper function implemented and tested
2. ✅ Integrated into alert pipeline
3. ✅ Caching working (>90% cache hit rate)
4. ✅ Feature flag controlling enablement
5. ✅ Unit tests passing (10+ tests)
6. ✅ Manual validation (create alert → see MITRE tags)

---

## Performance Targets

- **Latency:** <500ms per alert (LLM call)
- **Cache Hit Rate:** >90% (after warm-up)
- **Accuracy:** >80% (correct MITRE technique for common attacks)

---

## Cost Analysis

**Without Cache:**
- 1M alerts/month × $0.01/mapping = $10,000/month ❌ TOO EXPENSIVE

**With 90% Cache Hit Rate:**
- 1M alerts × 10% cache miss × $0.01 = $1,000/month ✅ ACCEPTABLE

**With Risk Score Filter (≥50):**
- 300K high-risk alerts × 10% cache miss × $0.01 = $300/month ✅ EXCELLENT

---

## Timeline

**Day 1 (4-6 hours):**
- Hour 1-2: Implement core mapping function
- Hour 3: Integrate into alert pipeline
- Hour 4: Add caching
- Hour 5-6: Unit tests + validation

**Ship:** Week 1 (after validation)

---

**This spec guides the autonomous spike implementation.**
