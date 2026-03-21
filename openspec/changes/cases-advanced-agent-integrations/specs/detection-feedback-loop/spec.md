## ADDED Requirements

### Requirement: Detection gap analysis skill identifies missing detection rules

The system SHALL provide a skill `detection-gap-analysis` registered in the Security Solution plugin. The skill SHALL instruct the agent to:

1. **Extract observed techniques**: Read the case's alerts and extract all MITRE ATT&CK technique IDs (from `kibana.alert.rule.threat[].technique[].id`)
2. **Inventory existing rules**: For each observed technique, query whether active detection rules cover that technique. Use `security.alerts` to search for rules by MITRE technique ID.
3. **Identify gaps**: Techniques present in the case's attack but NOT covered by any active detection rule are gaps.
4. **Propose new rules**: For each gap, compose a natural language detection rule description that includes:
   - The MITRE technique name and ID
   - The observed attack behavior from the case
   - Suggested data sources and ES|QL patterns
   - Reference to the case for context
5. **Offer rule creation**: Present the gaps and proposed descriptions to the analyst. If the analyst approves, use `security.create_detection_rule` to create each rule (in disabled state).
6. **Document in case**: Add a "Detection Coverage Analysis" comment to the case with findings.

The skill's `getAllowedTools()` SHALL return: `['platform.core.cases', 'platform.core.cases.add_comment', 'security.alerts', 'security.create_detection_rule', 'security.security_labs_search']`.

#### Scenario: Two MITRE techniques have no detection rules

- **WHEN** the agent runs `detection-gap-analysis` on a case with alerts covering T1566.001 (Phishing: Spearphishing Attachment), T1059.001 (PowerShell), and T1055 (Process Injection), and detection rules exist for T1566.001 and T1059.001 but not T1055
- **THEN** the agent reports T1055 as a detection gap, proposes a detection rule description for process injection based on the case evidence, and offers to create the rule

#### Scenario: Full detection coverage exists

- **WHEN** all MITRE techniques observed in the case have corresponding active detection rules
- **THEN** the agent reports: "Detection coverage is complete for all {N} MITRE techniques observed in this case. No gaps identified." and adds a summary comment to the case

#### Scenario: Rule creation with analyst approval

- **WHEN** the agent identifies a detection gap and proposes a rule, and the analyst approves
- **THEN** the agent calls `security.create_detection_rule` with the proposed description, and the rule is created in a disabled state. The agent notes in the case comment: "Detection rule '{ruleName}' created (disabled). Review and enable when ready."

#### Scenario: Case has no MITRE technique mappings

- **WHEN** the case's alerts have no MITRE ATT&CK technique annotations
- **THEN** the agent reports: "Cannot perform detection gap analysis — no MITRE ATT&CK techniques are mapped to the alerts in this case."

---

### Requirement: Case retrospective skill generates post-incident analysis

The system SHALL provide a skill `case-retrospective` registered in the Security Solution plugin. The skill SHALL instruct the agent to generate a post-incident retrospective when a case is closed (or at any time on analyst request). The retrospective SHALL include:

1. **Timeline**: Chronological sequence from first alert to case closure, including key events (case creation, status changes, severity escalations, comments, assignee changes)
2. **Response metrics**:
   - Time-to-Detect (TTD): First alert timestamp → case creation timestamp
   - Time-to-Respond (TTR): Case creation → first `in-progress` status change
   - Time-to-Resolve (TTRS): Case creation → `closed` status
   - Number of investigation rounds (comments), alerts attached, severity changes
3. **Investigation summary**: Key findings, true/false positive assessment, root cause
4. **Detection coverage**: Which rules fired, which techniques were involved, any detection gaps (referencing `detection-gap-analysis` if run)
5. **Recommendations**: Improvements for detection, response, and prevention
6. **Lessons learned**: What worked, what didn't, what to change for next time

The output SHALL be added as a final case comment using `platform.core.cases.add_comment`.

The skill's `getAllowedTools()` SHALL return: `['platform.core.cases', 'platform.core.cases.add_comment', 'security.alerts']`.

#### Scenario: Retrospective on a closed case

- **WHEN** the analyst asks the agent to "generate a retrospective for case abc-123" and the case status is `closed`
- **THEN** the agent reads the case, its alerts, user actions, and comments. It calculates TTD, TTR, and TTRS. It produces a structured retrospective comment with all six sections.

#### Scenario: Retrospective on an open case

- **WHEN** the analyst asks for a retrospective on a case that is still `open` or `in-progress`
- **THEN** the agent generates a partial retrospective (timeline, investigation summary, current metrics) and notes: "This case is still open. TTRS and final recommendations will be available after closure."

#### Scenario: Case with no comments or activity

- **WHEN** the case has no comments, no status changes, and only the initial creation event
- **THEN** the retrospective notes: "Minimal investigation activity detected. Consider documenting investigation steps as case comments for better retrospective analysis."

#### Scenario: Case with multiple severity escalations

- **WHEN** the case was escalated from `low` → `medium` → `critical` over its lifecycle
- **THEN** the retrospective timeline includes each escalation with timestamps and the retrospective highlights the escalation pattern
