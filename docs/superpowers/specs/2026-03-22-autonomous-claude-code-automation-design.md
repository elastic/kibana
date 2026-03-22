# Autonomous Claude Code Automation System

**Date:** 2026-03-22
**Author:** Claude (Sonnet 4.5) + Patryk Kopycinski
**Status:** Design Approved
**Implementation Approach:** Hybrid (Critical Path + Async)

---

## Executive Summary

This design specifies a comprehensive autonomous automation system for Claude Code that eliminates manual quality checks, learns from mistakes, and automatically builds promotion evidence. The system consists of three integrated subsystems:

1. **6-Tier Memory Hierarchy** - Single global memory pool (`~/.claude/memory/`) shared across all projects with automatic promotion pipeline
2. **Adaptive Hook System** - Synchronous safety gates (PreToolUse) + asynchronous quality automation (PostToolUse/Stop) with multi-signal learning
3. **Promotion Evidence Automation** - Zero-effort promotion case building from daily work logs and quality scores

**Key Innovation:** Adaptive safety that starts permissive and tightens based on incident patterns, false positive rates, and quality trends. The system learns from three signals: explicit corrections, detected failures, and quality scoring.

**Business Value:**
- Reduces bugs escaping to production
- Accelerates development velocity through automated quality gates
- Builds Principal II promotion case automatically
- Compounds learnings across all Elastic ecosystem projects (kibana, elastic-llm-benchmarker, cursor-plugin-evals)

---

## 1. System Architecture

### 1.1 High-Level Overview

The system consists of three interconnected subsystems:

```
┌─────────────────────────────────────────────────────────────┐
│                    Tool Call Initiated                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  PreToolUse Hooks (SYNC)                                     │
│  ├─ Query L3-knowledge for safety rules                     │
│  ├─ Check L6-audit for past incidents                       │
│  ├─ Adaptive decision: block / warn / allow                 │
│  └─ Write context to L1-session/current-context.json        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼ (if allowed)
┌─────────────────────────────────────────────────────────────┐
│                    Action Executes                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  PostToolUse Hooks (ASYNC)                                   │
│  ├─ Write event to L1-session/event-queue.jsonl             │
│  ├─ Fire-and-forget quality checks (lint, type check)       │
│  └─ User continues working (not blocked)                    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼ (on session stop)
┌─────────────────────────────────────────────────────────────┐
│  Stop Hooks (ASYNC)                                          │
│  ├─ Analyze L1-session/tool-history.jsonl                   │
│  ├─ Generate quality score → L6-audit/quality-scores.jsonl  │
│  └─ Generate daily log → L5-daily/YYYY-MM-DD.md             │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼ (on session end)
┌─────────────────────────────────────────────────────────────┐
│  SessionEnd Hooks (SYNC)                                     │
│  ├─ Process L1-session/event-queue.jsonl                    │
│  ├─ Review L4-nominate → promote to L3-knowledge            │
│  ├─ Extract promotion evidence from L5 + L6                 │
│  ├─ Clean L1-session/                                       │
│  └─ Return summary to user                                  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow

**Critical Path (Synchronous):**
- User → Tool Call → PreToolUse (query L3, check L6) → Block or Allow → Action

**Quality Path (Asynchronous):**
- Action → PostToolUse (queue event) → Background processing → Stop (score quality) → SessionEnd (promote memory)

**Learning Loop:**
- Incident → L6-audit → Pattern extraction → L4-nominate → Validation → L3-knowledge → Hook behavior changes

---

## 2. Memory Tier Architecture

### 2.1 Directory Structure

```
~/.claude/memory/                    # Single global pool (all projects)
├── L1-session/                      # Volatile (cleared after session)
│   ├── current-context.json            # Shared state between hooks
│   ├── event-queue.jsonl               # Async event buffer
│   └── tool-history.jsonl              # Actions taken this session
├── L2-agent/                        # Persistent per-specialist
│   ├── code-reviewer.md                # Code review agent context
│   ├── security-reviewer.md            # Security agent context
│   └── <agent-name>.md                 # Other subagent contexts
├── L3-knowledge/                    # Auditor-approved learnings
│   ├── kibana_testing_patterns.md      # Testing conventions
│   ├── cross_repo_sync_rules.md        # Multi-project patterns
│   ├── safety_rules.md                 # Adaptive safety patterns
│   └── <topic>.md                      # Other approved knowledge
├── L4-nominate/                     # Candidate learnings pipeline
│   ├── YYYY-MM-DD-<pattern>.md         # Pending review
│   └── <candidate>.md                  # Proposed rules/learnings
├── L5-daily/                        # Timestamped work logs
│   ├── 2026-03-22.md                   # Auto-generated daily summary
│   ├── 2026-03-21.md
│   └── YYYY-MM-DD.md
└── L6-audit/                        # Incidents + quality + promotion
    ├── incidents.jsonl                 # Failures, mistakes, corrections
    ├── quality-scores.jsonl            # Session quality metrics
    └── promotion-evidence.md           # Auto-extracted achievements
```

### 2.2 Tier Responsibilities

**L1-session (Volatile)**
- **Lifespan:** Current conversation only, cleared on SessionEnd
- **Purpose:** Shared state for hooks to communicate within a session
- **Files:**
  - `current-context.json`: What PreToolUse decided, what action was taken, what PostToolUse queued
  - `event-queue.jsonl`: Buffered events from async hooks (lint, type check, quality analysis)
  - `tool-history.jsonl`: Complete audit trail of all tool calls this session
- **Access:** All hooks can read/write

**L2-agent (Persistent)**
- **Lifespan:** Permanent, survives across sessions
- **Purpose:** Per-subagent persistent context and learnings
- **Files:** One markdown file per agent (e.g., `code-reviewer.md`)
- **Access:** Only the specific agent writes, hooks can read
- **Example:** Code reviewer remembers patterns it flagged previously to avoid duplicate warnings

**L3-knowledge (Approved Truth)**
- **Lifespan:** Permanent until explicitly removed
- **Purpose:** High-quality, validated knowledge used for decision-making
- **Promotion Criteria:** Novel + Quality Score >80 + No false positives
- **Files:** Topic-specific markdown (e.g., `safety_rules.md`, `kibana_testing_patterns.md`)
- **Access:** Hooks query for rules, SessionEnd hook promotes from L4
- **Example:** "kibana.jsonc files must pass jq validation before write" (learned from build failure)

**L4-nominate (Candidate Pipeline)**
- **Lifespan:** Temporary, auto-cleaned after promotion/rejection
- **Purpose:** Holding area for potential learnings before validation
- **Sources:** Detected failures, quality score patterns, incident analysis
- **Files:** Timestamped markdown proposals (e.g., `2026-03-22-validate-kibana-jsonc.md`)
- **Access:** Stop hook creates, SessionEnd hook reviews and promotes/discards

**L5-daily (Work Log)**
- **Lifespan:** Permanent archive
- **Purpose:** Daily work summaries for audit trail and promotion evidence extraction
- **Format:** One markdown file per day (`YYYY-MM-DD.md`)
- **Content:**
  - Work Completed (tasks, features, fixes)
  - Key Decisions (architectural choices, trade-offs)
  - Blockers Resolved (problems solved, root causes)
  - Technical Depth (complexity indicators)
- **Access:** Stop hook writes, SessionEnd hook reads for promotion extraction

**L6-audit (Accountability Trail)**
- **Lifespan:** Permanent archive
- **Purpose:** Complete accountability trail for incidents, quality trends, and promotion evidence
- **Files:**
  - `incidents.jsonl`: Every mistake, failure, correction (multi-signal learning input)
  - `quality-scores.jsonl`: Session quality scores with dimensional breakdown
  - `promotion-evidence.md`: Auto-extracted Principal II achievements
- **Access:** All hooks can append, SessionEnd hook reads and extracts

### 2.3 Migration of Existing Memory Files

**Current:** `~/.claude/projects/-Users-patrykkopycinski-Projects-kibana/memory/` (12 files)

**Migration Mapping:**
```
feedback_*.md           → L3-knowledge/     (approved patterns)
project_current_work.md → L5-daily/         (archive to latest date)
reference_*.md          → L3-knowledge/     (external pointers)
user_*.md               → Keep in project/  (not part of 6-tier)
```

**Migration Process:**
1. Create `~/.claude/memory/` structure (L1-L6)
2. Copy existing files to appropriate tiers:
   - `cp feedback_*.md ~/.claude/memory/L3-knowledge/`
   - `cp reference_*.md ~/.claude/memory/L3-knowledge/`
   - `echo "$(cat project_current_work.md)" > ~/.claude/memory/L5-daily/2026-03-22.md`
3. **Archive originals** (don't delete):
   - `mkdir ~/.claude/projects/-Users-patrykkopycinski-Projects-kibana/memory-archive-2026-03-22/`
   - `mv ~/.claude/projects/-Users-patrykkopycinski-Projects-kibana/memory/*.md memory-archive-2026-03-22/`
4. Create symlink for compatibility:
   - `ln -s ~/.claude/memory ~/.claude/projects/-Users-patrykkopycinski-Projects-kibana/memory`

---

## 3. Hook Architecture

### 3.1 PreToolUse Hooks (Synchronous Safety Gates)

**Execution Model:**
- Run BEFORE action
- Must complete before proceeding (blocking)
- Can block (exit 1) or allow (exit 0)
- Timeout: 30 seconds per hook

**Adaptive Decision Logic:**
1. Query L3-knowledge/safety_rules.md for known patterns
2. Check L6-audit/incidents.jsonl for past failures with this pattern
3. Evaluate risk:
   - **Catastrophic** (rm -rf /, dd if=, mkfs) → Block always
   - **Risky + past incident** → Warn with context from L6-audit
   - **Risky + no incident** → Allow but log to L4-nominate for review
   - **Safe or whitelisted** → Allow silently

**Hook Examples:**

**1. Adaptive Bash Safety Guard**
```json
{
  "matcher": "Bash",
  "hooks": [{
    "type": "agent",
    "prompt": "Adaptive bash safety guard:\n1. Read L3-knowledge/safety_rules.md for blocked patterns\n2. Read L6-audit/incidents.jsonl for past bash failures\n3. Evaluate $COMMAND:\n   - If matches blocked pattern → exit 1 with message\n   - If matches past incident pattern → warn with context, require confirmation\n   - If risky but new → allow, log to L4-nominate/bash-pattern-YYYY-MM-DD.md\n4. Write decision to L1-session/current-context.json",
    "timeout": 30
  }]
}
```

**2. Kibana.jsonc Validation**
```json
{
  "matcher": "Write(**/*kibana.jsonc)",
  "hooks": [{
    "type": "command",
    "command": "jq empty \"$PATH\" 2>&1 || (echo 'Invalid JSON5 in kibana.jsonc' && exit 1)",
    "description": "Validate kibana.jsonc syntax before write"
  }]
}
```

**3. Completeness Gate**
```json
{
  "matcher": "Write",
  "hooks": [{
    "type": "agent",
    "prompt": "Completeness gate for $PATH:\n1. Check if tests exist (grep for describe/it in **/*.test.ts)\n2. Check if types exported (if *.ts: grep for 'export type')\n3. Check circular deps (node scripts/check_circular_deps.js --file $PATH)\n4. Query L3-knowledge/kibana_testing_patterns.md for standards\n5. If incomplete:\n   - Log gap to L4-nominate/completeness-gap-YYYY-MM-DD.md\n   - Return {allow: false, reason: '<gap>'}\n6. If complete: return {allow: true}",
    "timeout": 30
  }]
}
```

**4. Destructive Command Blocker**
```json
{
  "matcher": "Bash(rm:*)",
  "hooks": [{
    "type": "prompt",
    "prompt": "⚠️ Destructive operation detected: $COMMAND\n\nQuery L6-audit/incidents.jsonl for past rm failures.\nIf past incident found, show context.\nRequire user confirmation before proceeding.",
    "timeout": 10
  }]
}
```

### 3.2 PostToolUse Hooks (Asynchronous Quality Checks)

**Execution Model:**
- Run AFTER action
- Write event to L1-session/event-queue.jsonl
- Fire-and-forget (user not blocked)
- Process queue at SessionEnd

**Hook Examples:**

**1. Auto-Lint TypeScript**
```json
{
  "matcher": "Edit|Write(**/*.{ts,tsx,js,jsx})",
  "hooks": [{
    "type": "command",
    "command": "echo '{\"type\":\"lint\",\"file\":\"'$PATH'\",\"timestamp\":\"'$(date -Iseconds)'\"}' >> ~/.claude/memory/L1-session/event-queue.jsonl && (node scripts/eslint --fix \"$PATH\" 2>&1 || true) &",
    "description": "Queue lint event and run eslint async"
  }]
}
```

**2. Type Check Reminder**
```json
{
  "matcher": "Edit(**/*.ts)",
  "hooks": [{
    "type": "agent",
    "prompt": "Type edit detected in $PATH.\n1. Detect tsconfig: walk up from $PATH to find tsconfig.json\n2. Queue event to L1-session/event-queue.jsonl: {type: 'type_edit', file: $PATH, tsconfig: <path>}\n3. Later (SessionEnd): Remind user to run yarn test:type_check --project <tsconfig>",
    "timeout": 15
  }]
}
```

**3. Git Commit Analysis**
```json
{
  "matcher": "Bash(git commit:*)",
  "hooks": [{
    "type": "agent",
    "prompt": "Git commit detected.\n1. Extract commit message from $COMMAND or $OUTPUT\n2. Queue event: {type: 'commit', message: '<msg>', timestamp: '<now>'}\n3. Event processed at SessionEnd for promotion evidence extraction",
    "timeout": 20
  }]
}
```

### 3.3 Stop Hooks (Quality Scoring)

**Execution Model:**
- Run when session stops (error, completion, interrupt)
- Analyze L1-session/tool-history.jsonl
- Write quality score to L6-audit/quality-scores.jsonl
- Generate daily log at L5-daily/YYYY-MM-DD.md
- Async (doesn't block session end, but completes before SessionEnd hook runs)

**Hook Implementation:**
```json
{
  "hooks": [{
    "type": "agent",
    "prompt": "Session quality analysis:\n\n## Scoring (0-100 per dimension)\n1. Read L1-session/tool-history.jsonl\n2. Score Principal II-aligned dimensions (each 0-100):\n\n   **Technical Leadership (0-100):**\n   - Architectural decisions made? (+25)\n   - System-level design? (+25)\n   - Multi-component integration? (+25)\n   - Long-term thinking? (+25)\n\n   **Problem Solving (0-100):**\n   - Root cause analysis performed? (+25)\n   - Non-obvious solution? (+25)\n   - Complex debugging? (+25)\n   - Innovation in approach? (+25)\n\n   **Influence (0-100):**\n   - Documentation created/updated? (+25)\n   - Patterns others can follow? (+25)\n   - Cross-team collaboration? (+25)\n   - Knowledge sharing? (+25)\n\n   **Strategic Delivery (0-100):**\n   - Infrastructure improvement? (+25)\n   - Process enhancement? (+25)\n   - Automation added? (+25)\n   - Long-term value? (+25)\n\n3. Overall score = Average of 4 dimensions\n\n## Principal Indicators\nDetect Principal II markers (any present = promotion-worthy):\n- architectural_decision (multi-component, system-level)\n- cross_repo_impact (affects >1 project)\n- complex_problem_solving (non-trivial root cause)\n- infrastructure_improvement (tooling, automation, DX)\n- innovation (novel approach, creative solution)\n- cross_team_collaboration (multiple teams/projects)\n\n## Outputs\n1. Write to L6-audit/quality-scores.jsonl:\n   {\n     \"timestamp\": \"2026-03-22T15:30:00Z\",\n     \"overall_score\": <avg of 4 dimensions>,\n     \"dimensions\": {\n       \"technical_leadership\": <0-100>,\n       \"problem_solving\": <0-100>,\n       \"influence\": <0-100>,\n       \"strategic_delivery\": <0-100>\n     },\n     \"principal_indicators\": [<list of indicators present>]\n   }\n\n2. Generate L5-daily/2026-03-22.md:\n   ## Work Completed\n   - [extracted from tool-history]\n   \n   ## Key Decisions\n   - [architectural choices made]\n   \n   ## Blockers Resolved\n   - [problems solved, root causes]\n   \n   ## Technical Depth\n   - [complexity indicators]",
    "timeout": 60
  }]
}
```

### 3.4 SessionEnd Hooks (Memory Promotion)

**Execution Model:**
- Run when session ends (final cleanup)
- Process L1-session/event-queue.jsonl (apply queued actions)
- Review L4-nominate → promote to L3-knowledge
- Extract promotion evidence from L5 + L6
- Clean L1-session/
- Synchronous (must complete before exit)

**Hook Implementation:**
```json
{
  "hooks": [{
    "type": "agent",
    "prompt": "Memory promotion pipeline:\n\n## Step 1: Process Event Queue\n1. Read L1-session/event-queue.jsonl\n2. For each event:\n   - {type: 'lint'}: Apply lint fixes if failed\n   - {type: 'type_edit'}: Remind to run type check if not run\n   - {type: 'commit'}: Log for promotion evidence\n\n## Step 2: Review L4-nominate Candidates\n1. For each L4-nominate/*.md:\n   a. Compare against existing L3-knowledge (is it novel?)\n   b. Check quality: Is it actionable? Specific? High-impact?\n   c. Check false positive rate: Was this pattern overridden >3 times?\n   d. Decision:\n      - Novel + Quality >80 + Low FP rate → Promote to L3-knowledge\n      - Duplicate or low quality → Discard\n      - Uncertain → Keep in L4 for next session\n2. Append promoted rules to L3-knowledge/safety_rules.md or L3-knowledge/<topic>.md\n3. Clean L4-nominate/ of processed files\n\n## Step 3: Extract Promotion Evidence\n1. Read L5-daily/2026-03-22.md\n2. Read L6-audit/quality-scores.jsonl (latest entry)\n3. If overall_score ≥ 85 AND principal_indicators.length > 0:\n   a. Extract key achievement from L5-daily\n   b. Map to Principal II competency (Technical Leadership, Problem Solving, etc.)\n   c. Frame impact at Principal level (scope, innovation, business value)\n   d. Append to L6-audit/promotion-evidence.md:\n      ## YYYY-MM-DD: <Title>\n      **Category:** <Competency>\n      **Achievement:** <What was done>\n      **Principal-Level Impact:** <Why it matters>\n      **Technical Depth:** <Complexity indicators>\n      **Metrics:** <Quantifiable impact>\n\n## Step 4: Cleanup\n1. Clear L1-session/ (current-context.json, event-queue.jsonl, tool-history.jsonl)\n2. Archive session metadata to L6-audit/session-archive/ if needed\n\n## Step 5: Return Summary\nReturn: {systemMessage: '📊 Session Quality: X/100 | 📝 Memory: Y promoted to L3 | 🎯 Promotion: Z entries added'}",
    "timeout": 90
  }]
}
```

---

## 4. Adaptive Learning Loop

### 4.1 Learning Signals (Multi-Source)

**Signal 1: Explicit Feedback** (Immediate promotion)
- **Trigger:** User says "this was a mistake, prevent it next time"
- **Capture:** Log to L6-audit/incidents.jsonl with `{type: "explicit_correction", pattern: "...", severity: "high"}`
- **Action:** Fast-track to L3-knowledge/safety_rules.md (no L4 review needed)
- **Example:** "Don't use --no-verify on git commit" → immediately becomes PreToolUse block rule

**Signal 2: Detected Failures** (Pattern extraction)
- **Trigger:** Build/test/lint/type failure detected
- **Capture:** Log to L6-audit/incidents.jsonl with `{type: "detected_failure", command: "...", error: "...", exit_code: X}`
- **Action:** Queue to L4-nominate for pattern extraction
- **Example:** 3 type errors in x-pack/platform → L4-nominate/prevent-xpack-type-errors.md → review → L3

**Signal 3: Quality Scoring** (Trend analysis)
- **Trigger:** Stop hook quality score
- **Capture:** Log to L6-audit/quality-scores.jsonl with dimensional breakdown
- **Action:** If dimension <70 for 5+ sessions → L4-nominate rule to enforce that dimension
- **Example:** Documentation score <70 for 5 sessions → L4-nominate/enforce-documentation.md → review → L3 completeness gate

### 4.2 Rule Evolution Pipeline

```
┌─────────────────────────────────────────────┐
│  Incident Occurs                            │
│  (explicit, detected, or quality-based)     │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│  L6-audit/incidents.jsonl                   │
│  {type, pattern, severity, timestamp, ...}  │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│  Pattern Extraction (Stop/SessionEnd hook)  │
│  - Analyze recent incidents                 │
│  - Detect recurring patterns                │
│  - Generate candidate rule                  │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│  L4-nominate/<candidate>.md                 │
│  Proposed rule with rationale               │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│  Validation (SessionEnd auditor)            │
│  - Is it novel? (not in L3)                 │
│  - Quality score? (>80)                     │
│  - False positive rate? (<20%)              │
└───────────────┬─────────────────────────────┘
                │
         ┌──────┴──────┐
         │             │
         ▼             ▼
    Promote        Discard
         │             │
         ▼             │
┌─────────────────┐    │
│  L3-knowledge/  │    │
│  safety_rules   │    │
└────────┬────────┘    │
         │             │
         ▼             ▼
┌─────────────────────────────────────────────┐
│  PreToolUse Hooks Query L3                  │
│  Behavior changes automatically             │
└─────────────────────────────────────────────┘
```

### 4.3 Example Learning Cycles

**Example 1: Bash Safety Evolution**

**Week 1:**
- Command: `rm -rf node_modules` → Allowed (common operation)
- L6-audit: No incident

**Week 2:**
- Command: `rm -rf node_modules/` (trailing slash in wrong directory)
- Incident: Deleted project files accidentally
- L6-audit/incidents.jsonl: `{type: "explicit_correction", pattern: "rm -rf .+/", severity: "high", timestamp: "2026-03-15"}`
- L4-nominate/warn-rm-trailing-slash.md created: "Warn on rm -rf with trailing slash"

**Week 3:**
- SessionEnd reviews L4-nominate/warn-rm-trailing-slash.md
- Novel? Yes. Quality? High. False positives? Zero (deterministic pattern)
- **Promoted to L3-knowledge/safety_rules.md**

**Week 4:**
- Command: `rm -rf build/` attempted
- PreToolUse hook queries L3-knowledge/safety_rules.md → match found
- **Warning shown:** "⚠️ rm -rf with trailing slash detected. Continue? (learned from incident on 2026-03-15)"
- **Mistake prevented automatically**

**Example 2: Type Check Enforcement**

**Month 1:**
- 12 commits made
- 5 commits fail CI due to type errors
- L6-audit accumulates: `{type: "detected_failure", error: "TS2345", file: "x-pack/...", count: 5}`

**Month 2:**
- SessionEnd detects pattern: "5 type errors in x-pack/ this month"
- L4-nominate/require-type-check-xpack.md: "Require type check confirmation before commit for x-pack/**"
- Quality validation: High-impact (prevents CI failures), low false positive rate
- **Promoted to L3-knowledge/safety_rules.md**

**Month 3:**
- Commit attempted in x-pack/ without type check
- PreToolUse completeness gate queries L3 → finds rule
- **Blocks commit:** "Type check required for x-pack/** (learned from 5 CI failures in Feb 2026). Run: yarn test:type_check --project <tsconfig>"

**Example 3: False Positive Handling**

**Scenario:**
- L3-knowledge/safety_rules.md contains: "Block git push --force on main"
- You push --force 3 times this week (intentional rebases, no issues)
- L6-audit logs: `{type: "rule_override", rule: "no-force-push-main", approved: true, count: 3}`

**Adaptive Response:**
- SessionEnd detects: Rule "no-force-push-main" overridden 3 times without incident
- **Auto-relaxes:** Move rule to "warn-only" mode in L3-knowledge
- Next push --force → warns but doesn't block: "⚠️ Force push to main detected. This rule was relaxed after 3 successful overrides."

### 4.4 Adaptive Threshold Management

**Quality-Based Tightening:**
```
IF (quality_scores.overall < 75 for 3+ sessions):
    L4-nominate: "Increase completeness gate threshold from 80 to 90"
    → Review → L3 → PreToolUse hooks become stricter
```

**Quality-Based Relaxation:**
```
IF (quality_scores.overall > 90 for 10+ sessions):
    L4-nominate: "Decrease completeness gate threshold from 90 to 85"
    → Review → L3 → PreToolUse hooks become more permissive
```

---

## 5. Promotion Evidence Automation

### 5.1 Daily Work Log Generation

**Trigger:** Stop hook (when session stops)

**Process:**
1. Read L1-session/tool-history.jsonl
2. Extract:
   - Files edited/created (from Write, Edit, Bash(git) calls)
   - Commands run (from Bash calls)
   - Commits made (from git commit)
   - PRs created (from gh pr create)
3. Categorize:
   - **Work Completed:** Tasks, features, fixes
   - **Key Decisions:** Architectural choices, trade-offs (inferred from comments, CLAUDE.md updates)
   - **Blockers Resolved:** Errors fixed, root causes identified
   - **Technical Depth:** Complexity indicators (multi-component, cross-repo, system design)
4. Write to `L5-daily/YYYY-MM-DD.md`

**Example Output:**
```markdown
# 2026-03-22 Work Log

## Work Completed
- Implemented 6-tier memory system for Claude Code
- Added adaptive safety hooks with multi-signal learning
- Fixed circular dependency in @kbn/evals-extensions
- Created promotion evidence automation pipeline

## Key Decisions
- **Hybrid async/sync hook model:** Safety hooks synchronous (blocking), quality hooks async (performance + safety trade-off)
- **Single global memory pool:** Share knowledge across all projects (kibana, benchmarker, evals) instead of per-project silos
- **Adaptive safety over aggressive blocking:** Start permissive, learn from mistakes, tighten based on patterns (better UX, self-improving)

## Blockers Resolved
- **Type errors in workflow extensions:** Root cause was incorrect tsconfig reference. Fixed by scoping type checks to x-pack/platform/packages/shared/kbn-evals-extensions/tsconfig.json
- **CI flakiness in Scout tests:** Traced to race condition in fixture setup. Added waitForSelector with explicit timeout.

## Technical Depth
- Architectural: Multi-tier memory system (L1-L6) with promotion pipeline
- Cross-repo: Elastic stack integration (ES, Kibana, LangSmith, Hugging Face)
- Infrastructure: Event-driven hook architecture with JSONL queues
- Innovation: Adaptive learning from multi-signal feedback (explicit + detected + quality)
```

### 5.2 Quality Scoring

**Trigger:** Stop hook

**Dimensions (0-100 each):**

1. **Technical Leadership (0-100)**
   - Architectural decisions made? (+25)
   - System-level design? (+25)
   - Multi-component integration? (+25)
   - Long-term thinking? (+25)

2. **Problem Solving (0-100)**
   - Root cause analysis performed? (+25)
   - Non-obvious solution? (+25)
   - Complex debugging? (+25)
   - Innovation in approach? (+25)

3. **Influence (0-100)**
   - Documentation created/updated? (+25)
   - Patterns others can follow? (+25)
   - Cross-team collaboration? (+25)
   - Knowledge sharing? (+25)

4. **Strategic Delivery (0-100)**
   - Infrastructure improvement? (+25)
   - Process enhancement? (+25)
   - Automation added? (+25)
   - Long-term value? (+25)

**Overall Score:** Average of 4 dimensions

**Principal Indicators:**
- `architectural_decision` (multi-component, system-level)
- `cross_repo_impact` (affects >1 project)
- `complex_problem_solving` (non-trivial root cause)
- `infrastructure_improvement` (tooling, automation, DX)
- `innovation` (novel approach, creative solution)
- `cross_team_collaboration` (multiple teams/projects involved)

**Output:**
```json
{
  "timestamp": "2026-03-22T15:30:00Z",
  "overall_score": 92,
  "dimensions": {
    "technical_leadership": 95,
    "problem_solving": 90,
    "influence": 85,
    "strategic_delivery": 90
  },
  "principal_indicators": [
    "architectural_decision",
    "cross_repo_impact",
    "infrastructure_improvement",
    "innovation"
  ]
}
```

### 5.3 Principal-Level Detection

**Threshold for Auto-Extraction:**
- Overall quality score ≥ 85 (top quartile)
- **AND** at least one principal indicator present

**Principal Indicators Mapping:**
- `architectural_decision` → Technical Leadership
- `complex_problem_solving` → Problem Solving
- `cross_team_collaboration` → Influence
- `infrastructure_improvement` → Strategic Delivery
- `innovation` → Problem Solving + Technical Leadership

### 5.4 Evidence Extraction

**Trigger:** SessionEnd hook (after quality scoring)

**Process:**
1. Read `L5-daily/YYYY-MM-DD.md`
2. Read `L6-audit/quality-scores.jsonl` (latest entry)
3. If `overall_score ≥ 85` AND `principal_indicators.length > 0`:
   - Extract key achievement from L5-daily (Work Completed, Key Decisions)
   - Map to Principal II competency framework
   - Frame impact at Principal level (scope, innovation, business value, technical depth)
   - Append to `L6-audit/promotion-evidence.md`

**Output Format:**
```markdown
## YYYY-MM-DD: <Achievement Title>

**Category:** <Technical Leadership | Problem Solving | Influence | Strategic Delivery>

**Achievement:**
<Clear description of what was accomplished, from L5-daily>

**Principal-Level Impact:**
- **Architectural Scope:** <System-level design, multi-component integration>
- **Innovation:** <Novel approach, creative solution, non-obvious insight>
- **Long-Term Value:** <Infrastructure, automation, compound benefits>
- **Business Value:** <Velocity, quality, risk reduction, cost savings>

**Technical Depth:**
<Complexity indicators: multi-tier architecture, event-driven design, adaptive algorithms, cross-repo coordination>

**Metrics:**
- Session quality score: X/100
- Technical leadership dimension: Y/100
- Cross-repo impact: N projects
- <Other quantifiable metrics>

---
```

**Example:**
```markdown
## 2026-03-22: Autonomous Claude Code Automation System

**Category:** Technical Leadership + Strategic Delivery

**Achievement:**
Designed and architected a self-improving automation system for Claude Code with 6-tier memory hierarchy, adaptive safety hooks, and automatic promotion evidence extraction. System learns from mistakes (multi-signal feedback) and evolves rules over time without manual intervention.

**Principal-Level Impact:**
- **Architectural Scope:** Multi-tier memory system (L1-L6) with event-driven hook architecture spans session management, quality automation, and knowledge promotion. Designed for cross-project knowledge sharing (kibana, elastic-llm-benchmarker, cursor-plugin-evals).
- **Innovation:** Adaptive safety model that starts permissive and tightens based on incident patterns, false positive rate, and quality trends. Novel approach to balancing protection vs friction.
- **Long-Term Value:** Self-improving system compounds learnings over time. Each mistake strengthens future prevention. Infrastructure scales across all Elastic ecosystem projects.
- **Business Value:** Reduces bug escapes to production, accelerates development velocity through automated quality gates, builds promotion case automatically (meta-benefit).

**Technical Depth:**
- Hybrid async/sync execution model (sync safety, async quality)
- Event-driven pipeline with JSONL event queues
- Multi-signal learning (explicit + detected + quality-based)
- Promotion pipeline: L6-audit → L4-nominate → L3-knowledge

**Metrics:**
- Session quality score: 92/100
- Technical leadership dimension: 95/100
- Cross-repo impact: 3 projects (kibana, benchmarker, evals)

---
```

### 5.5 Manual Override & Tuning

**Symlink for Cursor Compatibility:**
```bash
ln -s ~/.claude/memory/L6-audit/promotion-evidence.md ~/.cursor/promotion-evidence.md
```

**Threshold Adjustment:**
- Default: quality_score ≥ 85
- If too many entries: increase to 90
- If missing important work: decrease to 80
- Edit in L3-knowledge/promotion_settings.json

**Manual Additions:**
- You can always append to `L6-audit/promotion-evidence.md` manually
- Format should match auto-generated entries for consistency

---

## 6. Implementation Priorities

### Phase 1: Memory Foundation (Week 1)
1. Create 6-tier directory structure (`~/.claude/memory/L1-L6`)
2. Migrate existing memory files to appropriate tiers
3. Create L1-session scaffolding (current-context.json, event-queue.jsonl, tool-history.jsonl)
4. Test: Write to L1, verify cleanup on SessionEnd

### Phase 2: Safety Hooks (Week 1-2)
5. Implement PreToolUse: Bash safety guard (query L3, adaptive blocking)
6. Implement PreToolUse: kibana.jsonc validation (jq syntax check)
7. Implement PreToolUse: Completeness gate (tests, types, circular deps)
8. Test: Trigger each hook, verify blocking behavior

### Phase 3: Quality Automation (Week 2)
9. Implement PostToolUse: Auto-lint (queue to L1, run async)
10. Implement PostToolUse: Type check reminder (queue to L1)
11. Implement Stop: Quality scoring (analyze tool-history, write to L6)
12. Implement Stop: Daily log generation (write to L5)
13. Test: Verify async execution, event queueing

### Phase 4: Memory Promotion (Week 3)
14. Implement SessionEnd: Event queue processing
15. Implement SessionEnd: L4-nominate review and promotion to L3
16. Implement SessionEnd: L1-session cleanup
17. Test: Create L4 candidate, verify promotion logic

### Phase 5: Promotion Evidence (Week 3-4)
18. Implement SessionEnd: Promotion evidence extraction (L5 + L6 → promotion-evidence.md)
19. Create symlink: ~/.cursor/promotion-evidence.md
20. Test: High-quality session → verify evidence extracted

### Phase 6: Integration & Testing (Week 4)
21. Full end-to-end test: Safety → Quality → Memory → Promotion
22. Performance testing: Hook timeout tuning
23. False positive testing: Override rules, verify relaxation
24. Documentation: Update CLAUDE.md with new system

---

## 7. Success Criteria

**Safety Effectiveness:**
- ✅ Zero catastrophic bash commands executed (rm -rf /, dd if=)
- ✅ Zero invalid kibana.jsonc committed
- ✅ Circular dependency incidents reduced by >80%

**Quality Automation:**
- ✅ Lint errors auto-fixed within 5 seconds of edit
- ✅ Type check reminders shown for 100% of TypeScript edits
- ✅ Daily work log generated for every session

**Adaptive Learning:**
- ✅ 3+ rules promoted from L4 → L3 in first month
- ✅ Hook behavior changes based on learned patterns (verified with before/after tests)
- ✅ False positive rate <10% (rule overrides that didn't result in incidents)

**Promotion Evidence:**
- ✅ 80%+ of Principal-level work automatically captured
- ✅ Evidence entries match promotion competency framework
- ✅ Zero manual intervention required for routine work

**Performance:**
- ✅ PreToolUse hooks complete <10 seconds average
- ✅ PostToolUse hooks don't block user workflow
- ✅ SessionEnd completes <30 seconds

---

## 8. Risks & Mitigations

**Risk 1: Hook timeout causing workflow friction**
- **Mitigation:** Start with generous timeouts (30-60s), tune down based on actual performance
- **Fallback:** If hook times out, allow action by default (safety degradation but availability preserved)

**Risk 2: L4-nominate accumulation (too many candidates, slow review)**
- **Mitigation:** Auto-expire L4 candidates older than 7 days if not promoted
- **Cap:** Max 20 L4 candidates, oldest auto-discarded if exceeded

**Risk 3: False positives in adaptive learning (blocking valid operations)**
- **Mitigation:** Track override rate per rule, auto-relax if >20%
- **Escape hatch:** User can always override with confirmation

**Risk 4: L6-audit growth (unbounded JSONL files)**
- **Mitigation:** Rotate L6-audit/*.jsonl monthly, archive to L6-audit/archive/YYYY-MM/
- **Retention:** Keep last 3 months, compress older

**Risk 5: Cross-project memory pollution (irrelevant learnings from one project affecting another)**
- **Mitigation:** Tag L3-knowledge entries with project scope (global vs project-specific)
- **Hooks query:** Check project tag before applying rule

---

## 9. Future Enhancements

**Post-MVP Improvements:**

1. **Visual Dashboard** (Month 2)
   - Real-time quality score trending
   - Memory tier health metrics
   - Promotion evidence progress tracker

2. **Collaborative Learning** (Month 3)
   - Share L3-knowledge across team (Git-backed)
   - Collective incident database
   - Team-wide promotion evidence benchmarks

3. **Predictive Safety** (Month 4)
   - ML model trained on L6-audit incidents
   - Predict risk before action (not just pattern matching)
   - Proactive warnings: "This looks similar to incident on YYYY-MM-DD"

4. **Smart Summarization** (Month 5)
   - LLM-based daily log summarization (more concise)
   - Promotion evidence clustering (group related achievements)
   - Auto-generate "promotion narrative" from evidence

---

## 10. Appendix

### 10.1 File Formats

**L1-session/current-context.json:**
```json
{
  "session_id": "uuid",
  "started_at": "2026-03-22T10:00:00Z",
  "pretooluse_decisions": [
    {"tool": "Bash", "command": "rm -rf node_modules", "decision": "allowed", "timestamp": "..."}
  ],
  "posttooluse_queue_size": 3
}
```

**L1-session/event-queue.jsonl:**
```jsonl
{"type":"lint","file":"/path/to/file.ts","timestamp":"2026-03-22T10:05:00Z"}
{"type":"type_edit","file":"/path/to/file.ts","tsconfig":"/path/to/tsconfig.json","timestamp":"2026-03-22T10:06:00Z"}
{"type":"commit","message":"fix: resolve type errors","timestamp":"2026-03-22T10:10:00Z"}
```

**L6-audit/incidents.jsonl:**
```jsonl
{"type":"explicit_correction","pattern":"git push --force","severity":"high","timestamp":"2026-03-15T14:30:00Z","context":"User said: prevent force push to main"}
{"type":"detected_failure","command":"git commit -m 'test'","error":"Type error TS2345 in x-pack/...","exit_code":1,"timestamp":"2026-03-16T09:15:00Z"}
```

**L6-audit/quality-scores.jsonl:**
```jsonl
{"timestamp":"2026-03-22T15:30:00Z","overall_score":92,"dimensions":{"technical_leadership":95,"problem_solving":90,"influence":85,"strategic_delivery":90},"principal_indicators":["architectural_decision","cross_repo_impact","innovation"]}
```

### 10.2 Hook Configuration Reference

**Complete settings.json hooks section:**

NOTE: Placeholders (e.g., `<adaptive-bash-safety>`) refer to the full prompts defined in Section 3 (Hook Architecture). For actual implementation, copy the complete prompts from:
- Section 3.1: PreToolUse hooks (lines 218-267)
- Section 3.2: PostToolUse hooks (lines 269-295)
- Section 3.3: Stop hooks (lines 297-349)
- Section 3.4: SessionEnd hooks (lines 351-387)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{"type": "agent", "prompt": "<see Section 3.1 Example 1>", "timeout": 30}]
      },
      {
        "matcher": "Write(**/*kibana.jsonc)",
        "hooks": [{"type": "command", "command": "jq empty \"$PATH\" 2>&1 || (echo 'Invalid JSON5 in kibana.jsonc' && exit 1)", "timeout": 5}]
      },
      {
        "matcher": "Write",
        "hooks": [{"type": "agent", "prompt": "<see Section 3.1 Example 3>", "timeout": 30}]
      },
      {
        "matcher": "Bash(rm:*)",
        "hooks": [{"type": "prompt", "prompt": "<see Section 3.1 Example 4>", "timeout": 10}]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write(**/*.{ts,tsx,js,jsx})",
        "hooks": [{"type": "command", "command": "<see Section 3.2 Example 1>", "timeout": 5}]
      },
      {
        "matcher": "Edit(**/*.ts)",
        "hooks": [{"type": "agent", "prompt": "<see Section 3.2 Example 2>", "timeout": 15}]
      },
      {
        "matcher": "Bash(git commit:*)",
        "hooks": [{"type": "agent", "prompt": "<see Section 3.2 Example 3>", "timeout": 20}]
      }
    ],
    "Stop": [
      {
        "hooks": [{"type": "agent", "prompt": "<see Section 3.3 Hook Implementation>", "timeout": 60}]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [{"type": "agent", "prompt": "<see Section 3.4 Hook Implementation>", "timeout": 90}]
      }
    ]
  }
}
```

---

**End of Design Document**
