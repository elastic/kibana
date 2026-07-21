# Deep Watch ↔ Dark Watch Integration — Testing Scenarios

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    THREE-WATCH FLOW                         │
│                                                             │
│  1. DARK WATCH (threat-intelligence)                        │
│     ├─ Ingest threat report / IoC feed                      │
│     ├─ Extract MITRE ATT&CK techniques                      │
│     ├─ Hunt for behavior in environment                     │
│     └─ ESCALATE → Deep Watch with evidence package          │
│                                                             │
│  2. DEEP WATCH (deep-watch-forensics) ← NEW                 │
│     ├─ Accept evidence package (package_evidence)           │
│     ├─ Forensic reconstruction (ES|QL on Defend telemetry)  │
│     ├─ Produce DRAFT specialist report (produce_draft)      │
│     │   ├─ Timeline with provenance                         │
│     │   ├─ Validated IoCs (confirmed / not_found)           │
│     │   ├─ Persistence findings                             │
│     │   ├─ Remediation recommendations (PROPOSAL-ONLY)      │
│     │   ├─ Unresolved questions (named explicitly)          │
│     │   └─ Confidence levels (per-finding)                  │
│     ├─ HUMAN APPROVAL GATE (FR-082)                         │
│     └─ RECOMMEND CONTAINMENT → endpoint-response-actions    │
│                                                             │
│  3. RESPONSE (endpoint-response-actions)                    │
│     ├─ Isolate host(s)                                      │
│     ├─ Run malware scan                                     │
│     └─ Verify action status                                 │
└─────────────────────────────────────────────────────────────┘
```

## Skills in the Flow

| Skill | Role | Watch Layer | Write Actions? |
|-------|------|-------------|----------------|
| `threat-intelligence` | Ingest threat reports, extract MITRE, hunt behaviors | Dark Watch | No (creates detection rules only) |
| `endpoint-forensic-analysis` | Single-host forensic timeline, IoC extraction | Field (not Watch-tier) | No (read-only) |
| `deep-watch-forensics` | Specialist evidence packaging + draft forensic report | Deep Watch | No (proposals only — FR-007) |
| `endpoint-response-actions` | Isolate, scan, release hosts | Response | Yes (after human approval) |

## Feature Flags

All four skills are gated behind experimental features (all default `true` on this demo branch):

- `threatIntelligenceSkillEnabled` — Dark Watch
- `endpointForensicAnalysisSkillEnabled` — Field forensics
- `deepWatchSkillEnabled` — Deep Watch specialist
- `endpointResponseActionsSkillEnabled` — Response actions

---

## Scenario 1: Full Dark Watch → Deep Watch → Response Flow

**Objective**: Validate the complete three-Watch handoff from threat report ingestion through forensic specialist analysis to containment execution.

### Prerequisites

- Elastic Defend enrolled on at least 2 hosts with process/network/file/registry telemetry
- Osquery integration installed (for live mutex queries)
- Threat intelligence feed or a pasted threat report
- All four feature flags enabled

### Steps

#### Phase 1: Dark Watch — Threat Detection

1. **Analyst prompt**: *"A new ransomware advisory mentions Cobalt Strike beacons using scheduled tasks for persistence. Check our environment."*

2. **Expected skill activation**: `threat-intelligence`

3. **Expected tool calls**:
   - `threat_intel.find_threat_reports` — searches for Cobalt Strike / ransomware reports
   - `threat_intel.hunt_behavior` — extracts MITRE techniques (T1053.005 Scheduled Task, T1071.001 Application Layer Protocol)
   - `threat_intel.hunt_for_threat` or `threat_intel.analyse_environment` — checks if IoCs from the report exist in telemetry

4. **Expected escalation**: When the hunt confirms presence in the environment, the skill should offer escalation to `deep-watch-forensics` per the handoff prose in `skill_kibana.md`.

#### Phase 2: Deep Watch — Evidence Packaging + Draft Forensic Report

5. **Analyst confirms escalation**: *"Yes, perform a deep forensic analysis."*

6. **Expected skill activation**: `deep-watch-forensics`

7. **Expected tool calls**:
   - `security.deep_watch.package_evidence` — accepts evidence package with:
     - `source_watch: "dark-watch"`
     - `hosts: ["web-server-01", "db-server-02"]` (from Phase 1 hunt)
     - `iocs: [{ type: "file_hash", value: "abc123..." }, { type: "network_destination", value: "evil-c2.example.com" }]`
     - `mitre_techniques: ["T1053.005", "T1071.001"]`
     - `open_questions: ["Entry vector unknown", "Lateral movement scope unclear"]`
   - `platform.core.generate_esql` + `platform.core.execute_esql` — forensic reconstruction queries
   - `security.deep_watch.produce_draft_forensic_report` — produces structured draft with:
     - `report_status: "DRAFT — Pending Specialist Review (FR-082)"`
     - Timeline events sorted chronologically
     - Validated IoCs (confirmed/not_found against live telemetry)
     - Unresolved questions
     - Confidence assessment

8. **Expected output validation**:
   - Report is explicitly labeled DRAFT
   - All IoCs have a status (confirmed, not_found, or unable_to_validate)
   - Timeline events cite source indices
   - Confidence is independent of severity
   - Remediation recommendations are PROPOSAL-ONLY

#### Phase 3: Response — Containment Execution

9. **Analyst approves draft + containment**: *"Approved. Proceed with containment."*

10. **Expected skill activation**: `endpoint-response-actions`

11. **Expected tool calls**:
    - `security.endpoint_response_actions.list_endpoints` — confirm enrolled hosts
    - `security.endpoint_response_actions.get_endpoint_status` — check current isolation state
    - `security.endpoint_response_actions.isolate_host` — isolate affected hosts
    - `security.endpoint_response_actions.scan_host` — run malware scan
    - `security.endpoint_response_actions.get_response_action_status` — poll action completion

12. **Expected output**: Action IDs for isolation and scan, with status tracking.

### Pass Criteria

- [ ] Dark Watch correctly identifies the threat and extracts MITRE techniques
- [ ] Dark Watch offers escalation to Deep Watch (not auto-escalating)
- [ ] Deep Watch packages evidence with correct provenance
- [ ] Deep Watch produces a draft report labeled as DRAFT
- [ ] Deep Watch validates IoCs against live telemetry
- [ ] Deep Watch names unresolved questions and confidence limits
- [ ] Deep Watch recommends containment but does NOT execute
- [ ] Response actions execute only after explicit analyst approval
- [ ] Action IDs are surfaced for audit trail

---

## Scenario 2: Insufficient Evidence — Deep Watch Fails Closed

**Objective**: Validate that Deep Watch explicitly reports evidence gaps instead of fabricating findings (FR-DP-06).

### Steps

1. **Analyst prompt**: *"Perform deep forensic analysis on host 'nonexistent-host-99' for the last 24 hours."*

2. **Expected skill activation**: `deep-watch-forensics`

3. **Expected tool calls**:
   - `security.deep_watch.package_evidence` with hosts: ["nonexistent-host-99"]

4. **Expected output**:
   - `evidence_sufficient: false`
   - `insufficiency_reasons` includes: "No process telemetry found for hosts [nonexistent-host-99]..."
   - `guidance`: "Evidence insufficient — return an explicit gap report. Do NOT fabricate..."

5. **Expected agent behavior**:
   - Report that evidence is insufficient
   - Name what is missing (no Defend telemetry for the host)
   - Do NOT produce a fabricated timeline or IoC table
   - Suggest enrolling the host or checking the hostname

### Pass Criteria

- [ ] `evidence_sufficient` returns `false`
- [ ] Insufficiency reasons are specific (not generic)
- [ ] No fabricated timeline or IoCs
- [ ] Agent guidance explicitly says "do not fabricate"

---

## Scenario 3: Forensic Skill → Deep Watch Escalation

**Objective**: Validate that `endpoint-forensic-analysis` offers Deep Watch escalation when scope exceeds single-host timeline.

### Steps

1. **Analyst prompt**: *"I need a specialist forensic report with evidence packaging for the incident on web-server-01. This needs to go to the IR team."*

2. **Expected skill activation**: `endpoint-forensic-analysis` initially

3. **Expected flow**:
   - Forensic skill performs standard reconstruction (patient zero, timeline, IoC extraction)
   - After presenting findings, offers escalation to `deep-watch-forensics` per the "Escalation to Deep Watch" section in the skill content
   - Analyst confirms → Deep Watch receives the evidence package

### Pass Criteria

- [ ] Forensic skill completes its standard workflow first
- [ ] Escalation to Deep Watch is offered (not automatic)
- [ ] Deep Watch receives IoCs, hosts, and open questions from the forensic skill output

---

## Scenario 4: Dark Watch Coverage Gap — No Escalation Needed

**Objective**: Validate that Dark Watch does NOT escalate to Deep Watch when the threat is only a detection recommendation (not confirmed present).

### Steps

1. **Analyst prompt**: *"What threats are trending that we don't have detection coverage for?"*

2. **Expected skill activation**: `threat-intelligence`

3. **Expected tool calls**:
   - `threat_intel.coverage_gap` — returns uncovered MITRE techniques
   - Renders `threat-intel-mitre-heatmap` Canvas

4. **Expected behavior**:
   - Recommendations are for rule creation/enabling
   - NO escalation to Deep Watch (threat is not confirmed in environment)

### Pass Criteria

- [ ] Coverage gap analysis runs correctly
- [ ] No Deep Watch escalation offered (threat is theoretical, not confirmed)
- [ ] Recommendations are detection-rule focused

---

## Scenario 5: Deep Watch Draft Review — Confidence and Caveats

**Objective**: Validate that the draft forensic report correctly separates fact from inference from recommendation (FR-143) and includes per-finding confidence.

### Steps

1. Trigger Deep Watch with a real incident scenario (use seeded data from Scenario 1)

2. Inspect the `produce_draft_forensic_report` output:

3. **Expected output structure**:
   ```json
   {
     "report_status": "DRAFT — Pending Specialist Review (FR-082)",
     "scope": { "hosts": [...], "time_window_hours": 72, "mitre_techniques": [...] },
     "timeline": [{ "timestamp": "...", "host": "...", "event_type": "...", ... }],
     "validated_iocs": [{ "type": "file_hash", "value": "...", "status": "confirmed", "source_event": "..." }],
     "persistence_findings": "...",
     "remediation_recommendations": ["All recommendations below are PROPOSAL-ONLY..."],
     "unresolved_questions": ["Earliest recovered event is at..."],
     "confidence_assessment": {
       "overall": "medium",
       "rationale": "Sufficient telemetry events for moderate-confidence...",
       "note": "Confidence is independent of severity (FR-141)..."
     }
   }
   ```

### Pass Criteria

- [ ] `report_status` includes "DRAFT"
- [ ] Remediation recommendations are prefixed with PROPOSAL-ONLY
- [ ] Confidence assessment includes overall level + rationale
- [ ] Confidence note references FR-141 (independent of severity)
- [ ] Unresolved questions are non-empty (there are always unknowns)
- [ ] Validated IoCs include both confirmed and not_found statuses

---

## Scenario 6: Multi-Host Lateral Movement — Full Pipeline

**Objective**: Validate the three-Watch flow across multiple hosts with lateral movement detection.

### Prerequisites

- 3+ hosts enrolled with Defend
- Seeded attack data: Host A compromised → lateral movement to Host B → C2 from Host B

### Steps

1. Dark Watch identifies C2 IoCs from a threat report
2. Dark Watch hunts and confirms C2 beacon on Host B
3. Dark Watch escalates to Deep Watch with Hosts A and B
4. Deep Watch packages evidence for both hosts
5. Deep Watch reconstructs:
   - Patient zero on Host A
   - Lateral movement from A → B
   - C2 establishment on Host B
6. Deep Watch produces draft with lateral movement chain documented
7. Deep Watch recommends isolating both Host A and Host B
8. Response actions isolate both hosts after approval

### Pass Criteria

- [ ] Timeline includes events from both hosts
- [ ] Lateral movement is detected (outbound connection from A, process creation on B)
- [ ] Draft report covers multi-host scope
- [ ] Containment recommendation covers all affected hosts

---

## Automated Test Coverage (Jest)

### Unit Tests Required

1. **`deep_watch_forensics_skill.test.ts`**:
   - Skill definition: id, name, description, content match expected values
   - `packageEvidenceSchema` validates required fields
   - `produceDraftSchema` validates required fields
   - Feature flag gating: skill only registers when `deepWatchSkillEnabled` is true
   - `package_evidence` handler: returns `evidence_sufficient: false` when no telemetry indices
   - `package_evidence` handler: returns `evidence_sufficient: true` when telemetry exists
   - `produce_draft` handler: returns DRAFT status label
   - `produce_draft` handler: returns validated IoCs with correct statuses
   - `produce_draft` handler: includes unresolved questions
   - `produce_draft` handler: includes confidence assessment with FR-141 note

2. **`register_skills.test.ts`** (update existing):
   - Deep Watch skill registers when `deepWatchSkillEnabled` is true
   - Deep Watch skill does NOT register when flag is false
   - Registration order: threat-intelligence before deep-watch (Dark Watch before Deep Watch)

3. **`skills.test.ts`** (update existing cross-skill validation):
   - Deep Watch description does not overlap with endpoint-forensic-analysis
   - Deep Watch description does not overlap with threat-hunting
   - Deep Watch description does not overlap with alert-analysis
