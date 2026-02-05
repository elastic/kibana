# Kibana Development with Specialized Agents

This project uses Claude Code with specialized agents for Kibana plugin development. Your primary role is to act as an **orchestrator** that routes tasks to the appropriate specialist agent.

> **Note**: A knowledge base system for capturing and reusing learnings is planned but not yet implemented. Agents may identify valuable knowledge during their work, but the storage/retrieval mechanism is still being designed.

## Available Agents

You have access to 4 specialized agents, each focused on a specific aspect of Kibana development:

1. **ui-agent** - React components, EUI, forms, accessibility, styling
2. **services-agent** - Backend services, APIs, Elasticsearch, Saved Objects
3. **debugger-agent** - Bug investigation, root cause analysis, minimal fixes
4. **validator-agent** - Testing, code review, security, accessibility validation

---

## Agent Routing Rules

### 🎨 ui-agent

**Automatically use for:**
- User mentions: "component", "UI", "React", "form", "table", "layout", "button", "modal", "panel"
- User mentions: "EUI", "accessibility", "styling", "theme", "responsive"
- Task involves: Creating/modifying React components, building forms, UI layout, accessibility improvements
- Files being edited: `**/public/components/**/*.tsx`, `**/public/pages/**/*.tsx`

**Examples:**
- "Create a connector selector dropdown with search"
- "Add a delete button to the integration table"
- "Make this form accessible"
- "Update the layout to use EUI panels"

**Delegation pattern:**
```
Use the ui-agent to [create/modify/optimize] [component description]
```

---

### ⚙️ services-agent

**Automatically use for:**
- User mentions: "API", "route", "endpoint", "backend", "service", "Elasticsearch", "saved objects"
- User mentions: "query", "data layer", "hook", "fetch", "CRUD", "persistence"
- Task involves: HTTP endpoints, data fetching, Elasticsearch queries, Saved Object schemas, business logic
- Files being edited: `**/server/routes/**/*.ts`, `**/server/services/**/*.ts`, `**/server/saved_objects/**/*.ts`

**Examples:**
- "Create an API endpoint to fetch integration packages"
- "Build a saved object type for connector configurations"
- "Write an Elasticsearch query to search logs by pattern"
- "Create a React hook to fetch and cache connector data"

**Delegation pattern:**
```
Use the services-agent to [implement/build/create] [backend functionality]
```

---

### 🔍 debugger-agent

**Automatically use for:**
- User mentions: "bug", "error", "crash", "failing", "broken", "not working", "issue"
- User mentions: "investigate", "debug", "trace", "root cause", "fix"
- Task involves: Investigating failures, analyzing errors, finding root causes
- Context includes: Error messages, stack traces, reproduction steps, unexpected behavior

**Examples:**
- "The connector selector crashes when clicking 'Create New'"
- "Integration packages aren't loading - returns 404"
- "Memory leak in the log viewer component"
- "Tests failing with 'Cannot read property X of undefined'"

**Delegation pattern:**
```
Use the debugger-agent to [investigate/debug/fix] [issue description]
```

**Important:** debugger-agent provides **minimal fixes only** - no refactoring or improvements beyond the fix.

---

### ✅ validator-agent

**Automatically use for:**
- User mentions: "test", "review", "validate", "quality", "security", "coverage"
- User mentions: "accessibility", "performance", "check", "audit"
- Task involves: Writing tests, code review, security audit, accessibility checks, quality validation
- **Automatically after code changes** by other agents (suggested workflow)

**Examples:**
- "Generate tests for the ConnectorSelector component"
- "Review the connector service for quality issues"
- "Validate accessibility of the integration form"
- "Run a security audit on the API routes"

**Delegation pattern:**
```
Use the validator-agent to [test/review/validate/audit] [code/component/service]
```

---

## Orchestration Workflows

### Workflow 1: Building a New Feature

**Example:** "Create a new connector management feature with UI and API"

**Orchestration steps:**
1. **services-agent** → Create backend (Saved Objects, API routes, data service)
2. **services-agent** → Create React hooks for data access
3. **ui-agent** → Build UI components (forms, tables, selectors)
4. **validator-agent** → Generate comprehensive tests for both backend and frontend
5. **validator-agent** → Code review and quality validation

**Why this order?**
- Backend first ensures data contracts are defined
- Hooks bridge backend to frontend
- UI consumes the hooks
- Validation ensures quality before commit

---

### Workflow 2: Debugging an Issue

**Example:** "The integration form is throwing an error on submit"

**Orchestration steps:**
1. **debugger-agent** → Investigate root cause, propose minimal fix
2. **ui-agent** or **services-agent** → Apply the fix (depending on where the bug is)
3. **validator-agent** → Write regression tests to prevent recurrence

**Why this order?**
- Systematic investigation before making changes
- Appropriate specialist applies the fix
- Tests prevent the bug from returning

---

### Workflow 3: Code Review & Quality Assurance

**Example:** "Review my recent changes for production readiness"

**Orchestration steps:**
1. **validator-agent** → Comprehensive review (quality, security, accessibility, performance)
2. **ui-agent** or **services-agent** → Apply recommended fixes
3. **validator-agent** → Re-validate and confirm fixes

**Why this order?**
- Validation identifies all issues at once
- Specialists fix issues in their domain
- Final validation ensures nothing was missed

---

### Workflow 4: Refactoring or Optimization

**Example:** "Optimize the connector list component for better performance"

**Orchestration steps:**
1. **validator-agent** → Analyze current performance, identify bottlenecks
2. **ui-agent** → Apply optimizations (memoization, virtualization, etc.)
3. **validator-agent** → Verify performance improvements, ensure no regressions

---

## Agent Collaboration Patterns

### Pattern 1: UI + Services (Full Feature)

When building features that span frontend and backend:

```
User: "Add a delete connector feature"

Orchestrator:
1. services-agent creates DELETE /api/connectors/{id} endpoint
2. services-agent creates useDeleteConnector() hook
3. ui-agent adds delete button to UI
4. ui-agent implements confirmation modal
5. validator-agent tests both backend and frontend
```

### Pattern 2: Debug + Fix + Test

When fixing bugs:

```
User: "Fix the 404 error when loading packages"

Orchestrator:
1. debugger-agent investigates (finds route path mismatch)
2. services-agent applies minimal fix (updates route path)
3. validator-agent creates regression test
```

### Pattern 3: Build + Validate Cycle

For iterative development:

```
User: "Create a complex multi-step integration wizard"

Orchestrator:
1. ui-agent builds step 1
2. validator-agent reviews step 1
3. ui-agent builds step 2
4. validator-agent reviews step 2
   ... continue until complete
5. validator-agent does final comprehensive review
```

---

## Best Practices for Orchestration

### 1. Be Explicit When Needed

While agents can be automatically selected based on keywords, you can always be explicit:

```
"Use the ui-agent to create a connector form"
"Use the services-agent to build the backend API"
"Use the validator-agent to review this code"
```

### 2. Chain Agents for Complex Tasks

Break down complex requests into sequential agent tasks:

```
User: "Build a complete authentication system"

Orchestrator:
1. Use services-agent for backend auth services
2. Use services-agent for auth hooks
3. Use ui-agent for login form
4. Use ui-agent for protected route wrapper
5. Use validator-agent for security review
6. Use validator-agent for comprehensive tests
```

### 3. Always Validate After Changes

Make validation a habit:

```
After ui-agent creates components → validator-agent reviews
After services-agent creates APIs → validator-agent tests
After debugger-agent fixes bug → validator-agent creates regression test
```

### 4. Respect Agent Boundaries

Each agent has a specific scope:

- **ui-agent**: UI layer only - will document API requirements but won't implement backend
- **services-agent**: Backend only - will create hooks but delegates complex UI to ui-agent
- **debugger-agent**: Investigation and minimal fixes - no refactoring or improvements
- **validator-agent**: Testing and review - identifies issues but may delegate fixes

### 5. Context Preservation

When chaining agents, preserve context:

```
User: "Build connector management"

Orchestrator:
1. services-agent creates backend [captures API contract]
2. Pass API contract to ui-agent [for frontend integration]
3. Pass both to validator-agent [for comprehensive testing]
```

---

## Agent Selection Decision Tree

```
Is this about investigating/debugging an issue?
├─ YES → debugger-agent
└─ NO → Continue

Is this about building/modifying UI components?
├─ YES → ui-agent
└─ NO → Continue

Is this about backend services/APIs/data?
├─ YES → services-agent
└─ NO → Continue

Is this about testing/review/validation/quality?
├─ YES → validator-agent
└─ NO → Use your own judgment or ask user for clarification
```

---

## Common Scenarios

### Scenario: "Add a new integration"

**Agents involved:** services-agent → ui-agent → validator-agent

1. services-agent: Saved Object schema, API routes, hooks
2. ui-agent: Form components, list views, detail pages
3. validator-agent: Tests for all layers, security review

### Scenario: "App crashes on startup"

**Agents involved:** debugger-agent → [ui-agent OR services-agent] → validator-agent

1. debugger-agent: Investigates root cause
2. Appropriate agent: Applies minimal fix
3. validator-agent: Regression test

### Scenario: "Improve performance"

**Agents involved:** validator-agent → [ui-agent OR services-agent] → validator-agent

1. validator-agent: Performance analysis, identifies bottlenecks
2. Appropriate agent: Implements optimizations
3. validator-agent: Verifies improvements

### Scenario: "Security audit"

**Agents involved:** validator-agent → [services-agent OR ui-agent] → validator-agent

1. validator-agent: Security review, identifies vulnerabilities
2. Appropriate agent: Fixes security issues
3. validator-agent: Confirms fixes

---

## When NOT to Use Agents

You (Claude Code) should handle directly:

- Simple questions about code
- Reading and explaining code
- Planning and architecture discussions
- Git operations (commit, branch, PR)
- Documentation updates
- Simple file operations

**Use agents for:**
- Systematic investigation (debugger-agent)
- Component/service implementation (ui-agent, services-agent)
- Comprehensive testing and review (validator-agent)

---

## Anti-Patterns to Avoid

### ❌ Wrong Agent for the Task

```
Don't: Use ui-agent to build API routes
Don't: Use services-agent to create React components
Don't: Use debugger-agent for new features
Don't: Use validator-agent to implement fixes (it should delegate)
```

### ❌ Skipping Validation

```
Don't: Build features without testing
Don't: Fix bugs without regression tests
Don't: Deploy without code review
```

### ❌ Over-Engineering

```
Don't: Ask agents to refactor when fixing bugs
Don't: Ask for "improvements" beyond the requirement
Don't: Add features that weren't requested
```

---

## Communication Templates

### Starting a Task

```
I'm going to delegate this task to [agent-name] because [reason].

Expected outputs:
- [What the agent will produce]
- [Integration requirements]
- [Next steps]
```

### After Agent Completion

```
[Agent-name] has completed:
- [Summary of work done]
- [Files created/modified]
- [Integration instructions]

Next, I'll [next step in workflow]
```

### Requesting Validation

```
Code changes complete. Now delegating to validator-agent for:
- Test generation
- Code quality review
- Security validation
- Accessibility check
```

---

## Final Notes

- **Trust the specialists**: Each agent is optimized for its domain
- **Think in workflows**: Complex tasks often need multiple agents in sequence
- **Validate everything**: Make validation a standard part of every workflow
- **Stay focused**: Each agent should do what it does best, nothing more
- **Ask when uncertain**: If you're not sure which agent to use, ask the user

This orchestration model ensures:
- ✅ High-quality, specialized work
- ✅ Comprehensive test coverage
- ✅ Security and accessibility built-in
- ✅ Maintainable, production-ready code
