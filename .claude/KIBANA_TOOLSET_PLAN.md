# Kibana Development Toolset Plan
**Claude Code Subagents & Skills Architecture**

## Overview
A comprehensive Claude Code toolset designed to streamline Kibana development through specialized subagents and reusable skills. Claude Code acts as the orchestrator, delegating work to specialized subagents.

> **Knowledge Base Status**: A knowledge capture and reuse system is planned for Phase 3, but implementation details are still being designed. Agents will have the capability to identify and document valuable learnings once the system is ready.

---

## Phase 1: Sub Agents

### 1.1 UI Agent(s)
**Purpose**: Handle all UI component creation, modification, and optimization

**Input**:
- Functional requirements (what the UI should do)
- Design specifications or mockups
- Integration points with existing UI

**Output**:
- Component code (React/TypeScript)
- API requirements and data contracts
- Integration instructions
- Required dependencies

**Potential Sub-specializations**:
- `ui-builder`: Creates new components
- `ui-optimizer`: Performance optimization, bundle size reduction
- `ui-test-writer`: Generates unit tests for UI components

**Key Responsibilities**:
- Follow Kibana's UI patterns (EUI components, hooks, styling)
- Ensure accessibility compliance
- Generate type-safe component interfaces
- Document component usage

---

### 1.2 Services Agent(s)
**Purpose**: Backend logic, data layer, and API management

**Input**:
- Service requirements (what data/operations are needed)
- Data models and schemas
- Integration requirements

**Output**:
- Service implementation
- API contracts (routes, types, validation)
- Data layer code (saved objects, ES queries)
- Usage documentation

**Potential Sub-specializations**:
- `saved-objects-agent`: Handles Kibana saved object operations
- `es-indices-agent`: Elasticsearch index management and queries
- `api-builder`: HTTP routes, request/response handling
- `data-transform-agent`: Data processing pipelines

**Key Responsibilities**:
- Follow Kibana's service patterns and conventions
- Ensure proper error handling
- Generate migration scripts when schemas change
- Document API contracts clearly

---

### 1.3 Debugger Agent
**Purpose**: Handle complex, long-running debugging processes

**Input**:
- Bug description or error logs
- Reproduction steps
- Affected components/services

**Output**:
- Root cause analysis
- Proposed fixes
- Feedback to orchestrator for human input when stuck
- Test cases to prevent regression

**Key Responsibilities**:
- Systematic investigation (logs, stack traces, code flow)
- Request human feedback when assumptions are uncertain
- Generate comprehensive test coverage for fixes

**Interaction Pattern**:
```
Debugger → Investigation → Hypothesis →
  ↓ (if stuck)
  → Orchestrator → Human Feedback →
  ↓ (if resolved)
  → Fix + Tests + Documentation
```

---

### 1.4 Validator/Tester Agent
**Purpose**: Quality assurance and testing across all work products

**Input**:
- Code to validate (from UI or Services agents)
- Testing requirements
- Quality criteria

**Output**:
- Test suites (unit, integration, functional)
- Validation reports
- Code quality feedback
- Performance benchmarks

**Key Responsibilities**:
- Generate comprehensive test coverage
- Run existing test suites
- Identify edge cases and failure modes
- Validate against Kibana conventions

**Access to Skills**:
- Testing patterns skill
- Kibana test utilities skill
- Validation checklists

---

## Phase 2: Skills

Skills are reusable, persistent behavioral patterns that agents can invoke.

### 2.1 Kibana Research Skill
**Purpose**: Provide standardized instructions for researching Kibana patterns

**Contents**:
- How to search for similar implementations
- Where to look for patterns (recently updated plugins)
- How to identify the "right" way to do something in Kibana
- Common plugin directories and their purposes

**Usage**: Any agent needing to understand "how Kibana does X"

---

### 2.2 Testing Framework Skill
**Purpose**: Standardized testing approaches for different agent outputs

**Contents**:
- UI testing patterns (Jest, React Testing Library)
- Services testing patterns (integration tests, mocks)
- E2E testing guidance (Playwright/Cypress)
- Test organization and naming conventions

**Usage**: Validator agent, post-implementation verification

---

### 2.3 Recent Plugins Research Skill
**Purpose**: Analyze recently updated plugins for current best practices

**Contents**:
- Git commands to find recently modified plugins
- What to look for in modern implementations
- How to extract patterns from existing code
- Identifying deprecated patterns to avoid

**Usage**: When implementing new features or refactoring

---

### 2.4 Code Review Skill
**Purpose**: Systematic code review checklist

**Contents**:
- Security review (XSS, injection, auth)
- Performance review (bundle size, render cycles)
- Accessibility review (ARIA, keyboard nav)
- Convention compliance (TypeScript, naming, structure)

**Usage**: Validator agent, pre-PR reviews

---

## Implementation Roadmap

### Sprint 1: Foundation
- [ ] Create directory structure (`.claude/skills/`, `.claude/agents/`)
- [ ] Create first skill: `kibana-research.md`

### Sprint 2: Core Agents
- [ ] Build UI Agent manifest
- [ ] Build Services Agent manifest
- [ ] Test agent delegation from Claude Code orchestrator

### Sprint 3: Skills Expansion
- [ ] Create testing framework skill
- [ ] Create code review skill
- [ ] Create recent plugins research skill
- [ ] Integrate skills with all agents

### Sprint 4: Refinement
- [ ] Test full workflow (task → agent → output)
- [ ] Optimize agent prompts based on usage
- [ ] Document toolset usage for team

---

## Success Metrics

- **Agent Effectiveness**: Subagents produce code that requires <20% manual revision
- **Time Savings**: Common tasks (UI component, API route) take <50% of baseline time
- **Quality**: Test coverage >80%, zero critical security issues

---

## Future Enhancements

- **Skill Versioning**: Track skill effectiveness and iterate
- **Agent Specialization**: Further split agents based on usage patterns
- **Integration Testing**: Dedicated agent for cross-module testing

---

## Phase 3: Knowledge Base (Implementation TBD)

**Status**: Concept approved, implementation details pending

**Core Capabilities Needed**:
- Capture learnings from debugging sessions and investigations
- Document discovered patterns, gotchas, and solutions
- Store reusable knowledge for future reference
- Make knowledge searchable/accessible to agents and developers

**Use Cases**:
- Debugger agent documents root causes and fixes
- All agents can reference past solutions
- Team members can search for institutional knowledge
- Prevent solving the same problem twice

**Open Questions**:
- Storage format and structure (markdown files, database, etc.)
- Indexing and retrieval mechanism
- Deduplication strategy
- Integration approach with agents
- Update and maintenance workflow

**Next Steps**: Design and implement knowledge base system after core agents are stable and usage patterns are understood.

---

## Notes

- This toolset is designed for the Kibana monorepo specifically
- Agents should never over-engineer or add unnecessary features
- All outputs should follow Kibana conventions
- Human feedback is crucial - agents should ask when uncertain
- **Knowledge capture and reuse is planned** - agents can document findings, but the storage/retrieval mechanism is still being designed
