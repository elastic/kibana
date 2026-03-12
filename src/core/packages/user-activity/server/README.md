# @kbn/core-user-activity-server

This package contains the public types for Core's server-side user activity service.

---

# Technical Reference


## Usage

Use `trackUserAction` to record user actions:

```ts
core.userActivity.trackUserAction({
  event: {
    action: 'create_alerting_rule',
    type: 'creation',
    start: new Date().toISOString(),
    end: new Date().toISOString(),
    duration: 250000000, // 250ms in ns
  },
  object: { id: 'production-rule', name: 'My rule', type: 'rule', tags: ['production'] },
});
```

You can optionally provide a custom message and metadata:

```ts
core.userActivity.trackUserAction({
  message: 'User snoozed an alerting rule',
  event: { action: 'snooze_alerting_rule', type: 'change' },
  object: { id: 'rule-456', name: 'CPU usage threshold', type: 'rule', tags: ['production'] },
  metadata: {
    ui_surface: 'rules_table',
    interaction_id: 'snooze_rule_flyout',
  },
});
```

## Registering new actions

Every action must be registered in `userActivityActions` ([`src/user_activity_actions.ts`](./src/user_activity_actions.ts)).
Each entry requires a `description`, an `ownerTeam` (GitHub team handle), and a `versionAddedAt` (Stack version when the action was introduced).

```ts
export const userActivityActions = {
  // ... existing actions ...
  create_cases_case: {
    description: 'Create a case',
    ownerTeam: '@elastic/kibana-cases',
    groupName: 'Cases',
    versionAddedAt: '9.3',
  },
} as const satisfies Record<string, UserActivityActionDefinition>;
```

When an action is removed, move it from `userActivityActions` to `removedUserActivityActions` and add `versionRemovedAt`.

After adding an action, regenerate the docs snippet by running `node scripts/generate user-activity-actions-docs`. This updates the action list shown in the docs.

## Configuration

Configure the service in `kibana.yml`:

```yaml
user_activity:
  enabled: true
  appenders:
    # If you don't provide any appender, this is the default we'll use if enabled 
    console:
      type: console
      layout:
        type: json
    # Example: write to file
    file:
      type: file
      fileName: /var/log/kibana/user_activity.log
      layout:
        type: json
  filters:
    - policy: keep
      actions: [create_security_rule]
```

The `appenders` option uses the same schema as the core logging service.

### Filters

You can optionally configure `user_activity.filters` to control which `event.action` values are logged.

For an activity to be logged, its `event.action` must pass **all** configured filters:

- `policy: keep` logs only the actions listed in `actions`
- `policy: drop` logs all actions except those listed in `actions`

If `filters` is not configured (or empty), all actions are eligible to be logged.

## Injected Context

The following context is automatically added to every log entry by Kibana's HTTP middleware:

| Field | Description |
|-------|-------------|
| `user.id` | User's profile UID |
| `user.name` | Username |
| `user.email` | Email address |
| `user.roles` | Array of roles |
| `client.ip` | IP address |
| `client.address` | IP address (OTel compliance) |
| `session.id` | Session ID |
| `kibana.space.id` | Current space ID |
| `http.request.referrer` | Referrer |

## Log schema

Here's the current schema reference: [`docs/reference/user-activity.md`](../../../../../docs/reference/user-activity.md#logs-schema).

Some of the fields in the schema come from:

- `trackUserAction()` params (for example `message`, `event.*`, `object.*`, `metadata.*`)
- Injected context (for example `user.*`, `session.*`, `client.*`, `kibana.space.id`, and `http.request.referrer`)
- Fields automatically added by the logging system / JSON layout (for example `@timestamp`)

> **Important**
>
> If you need to extend this schema, reach out to the Core team (`@elastic/kibana-core`).



---

# Instrumentation Guidelines

The sections below are aimed at **teams deciding what to instrument and how to name it**. They complement the technical API reference above and apply to everyone contributing actions to `userActivityActions`.

## 1. What to Instrument

The user activity log captures **deliberate user decisions**, not system behavior or passive navigation. Every event must answer yes to this question: _If a user saw this entry in their own activity log, would they recognize it as something they consciously did?_
**Check if an action already exist before instrumenting a new one.**

### Instrument these

| Category | Examples |
| --- | --- |
| Intentional create / update / delete actions | Creating a rule, deleting a dashboard, editing a connector |
| State-changing configuration | Updating alert severity, changing case status |
| Lifecycle transitions | Escalating a case, closing an alert, snoozing a rule |
| High-intent navigation | Refresh a dashboard, launching the anomaly explorer |
| AI and assistant interactions | Submitting a prompt, adding a knowledge base entry |
| Bulk operations | Bulk-deleting alerts, bulk-enabling rules |
| Integration triggers | Pushing a case to Jira, running a connector action |

### Do not instrument these

| Anti-pattern | Reason |
| --- | --- |
| Passive page views | No actionable signal; use product analytics for funnel analysis |
| Polling and auto-refresh | System-initiated, not user-initiated |
| Internal framework operations | Not meaningful to a human reading the log |
| Autosave / draft state saves | Not a user decision |
| Read-only list fetches on page load | No user intent |
| Redundant sub-events | If the parent event covers the action, don't also emit the child |
| System-generated actions | `rule_auto_recovered`, `session_expired` |

## 2. Event Naming Format

### Base Structure: `{verb}_{context}_{noun}`

| Part | Role | Constraints |
| --- | --- | --- |
| **verb** | The action the user took | Must come from the approved verb list (Section 3) |
| **context** | Kibana feature area | Canonical plugin name, no invented abbreviations |
| **noun** | The object type acted on | Singular, lowercase, matches the product name for the entity |

All lowercase, snake\_case. No camelCase, no hyphens.

For bulk variants, append `_bulk` to the noun: `delete_cases_comment_bulk`.

### Examples

| Event name | Verb | Context | Noun |
| --- | --- | --- | --- |
| `create_alerting_rule` | `create` | `alerting` | `rule` |
| `delete_cases_comment` | `delete` | `cases` | `comment` |
| `enable_security_rule` | `enable` | `security` | `rule` |
| `push_cases_case` | `push` | `cases` | `case` |
| `submit_ai_assistant_prompt` | `submit` | `ai_assistant` | `prompt` |
| `install_fleet_integration` | `install` | `fleet` | `integration` |

## 3. Approved Verb List

Use only verbs from this list. If a new verb is genuinely needed, propose it with the Kibana Core team.

| Verb | When to use | Do not use instead |
| --- | --- | --- |
| `create` | User creates a new persisted object | `add`, `new`, `make` |
| `update` | User modifies an existing object | `edit`, `change`, `modify`, `save` |
| `delete` | User permanently removes an object | `remove`, `destroy` |
| `view` | High-intent governed read (use sparingly) | `open`, `read`, `access` |
| `refresh` | High-intent governed refresh (use sparingly) | `load`, `reload`, `reopen` |
| `enable` | User activates an inactive object | `activate`, `turn_on` |
| `disable` | User deactivates an active object | `deactivate`, `turn_off` |
| `stop` | User stops a running process | `pause`, `halt` |
| `open` | User transitions a workflow object to active | `reopen`, `resume` |
| `close` | User closes or resolves a workflow object | `resolve`, `finish` |
| `assign` | User assigns an object to a person | `link_user`, `add_assignee` |
| `unassign` | User removes an assignment | `remove_assignee` |
| `push` | User sends an object to an external system | `export_to`, `sync`, `send` |
| `export` | User exports data to a file or download | `download`, `extract` |
| `import` | User imports data from a file | `upload` |
| `install` | User installs a package or integration | `add_integration`, `deploy` |
| `uninstall` | User removes a package or integration | `remove_integration` |
| `mute` | User silences notifications | `silence`, `suppress` |
| `unmute` | User re-enables notifications | `unsuppress` |
| `snooze` | User suppresses for a time window | `pause_notifications`, `defer` |
| `unsnooze` | User cancels a snooze early | |
| `acknowledge` | User acknowledges an alert or workflow item | `confirm`, `accept` |
| `escalate` | User escalates severity or routing | `promote`, `raise` |
| `tag` | User applies a tag | `add_tag`, `label` |
| `untag` | User removes a tag | `remove_tag` |
| `share` | User shares an object to a space | `add_to_space`, `publish` |
| `unshare` | User removes sharing | `remove_from_space` |
| `clone` | User duplicates an object | `copy`, `duplicate` |
| `submit` | User submits a prompt or form for processing | `send`, `run` (for AI prompts) |
| `run` | User manually triggers an on-demand execution | `execute`, `fire` |
| `schedule` | User schedules a future or recurring action | `automate` |
| `log_in` | User logs in |  |
| `log_out` | User logs out |  |

## 4. Language for Human-Readable Fields

### The `message` field

Format: `{Subject} {past-tense verb} {object} [{qualifier}].`

**Rules:**

- Write in third person using "User" as the subject: `User created a rule.` not `You created a rule.`
- Use **past tense** for completed actions: `User deleted the dashboard.`
- Use **present progressive** only for in-flight operations logged before the outcome is known: `User is creating a connector.`
- Include the object name (quoted) and ID when available: `User enabled rule "High CPU Alert" (id: abc123).`
- Use the product name for objects, not internal type keys: `User created a detection rule.` not `User created a siem.queryRule.`
- Use active voice, sentence case, end with a period.

### Tense matches outcome

| `event.outcome` | Tense | Example |
| --- | --- | --- |
| `unknown` | Present progressive | `User is creating a connector.` |
| `success` | Simple past | `User created a connector.` |
| `failure` | Simple past with reason | `User failed to create a connector. Reason: Not authorized.` |

### Qualifier patterns

- Object name and ID: `"My Rule" (id: abc123)`
- Bulk count: `User deleted 14 alerts.`
- Target system: `User pushed case "Login Failure Spike" to ServiceNow (id: case-xyz).`
- Failure reason: `Reason: Rule contains invalid query syntax.`

### Other fields

| Field | Rule |
| --- | --- |
| `event.action` | Snake\_case action key only, never a sentence |
| Object `name` in qualifiers | Always quoted: `"My Dashboard"` |
| Error `reason` | Capital first letter, no period: `Reason: Not authorized to delete this object` |
| Outcome labels in UI | Title case, no verb: `Rule Created`, `Case Escalated` |

## 5. Kibana-Specific Examples

### Alerting

| Event action | Outcome | `message` |
| --- | --- | --- |
| `create_alerting_rule` | `unknown` | `User is creating a rule.` |
| `create_alerting_rule` | `success` | `User created rule "High CPU Alert" (id: 1a2b3c).` |
| `create_alerting_rule` | `failure` | `User failed to create a rule. Reason: Not authorized.` |
| `snooze_alerting_rule` | `unknown` | `User is snoozing rule "High CPU Alert" (id: 1a2b3c) for 8 hours.` |
| `run_alerting_rule` | `success` | `User ran rule "High CPU Alert" (id: 1a2b3c) on demand.` |

### Cases

| Event action | Outcome | `message` |
| --- | --- | --- |
| `create_cases_case` | `success` | `User created case "Login Failure Spike" (id: case-001).` |
| `update_cases_status` | `success` | `User updated status of case "Login Failure Spike" (id: case-001) to "in-progress".` |
| `push_cases_case` | `unknown` | `User is pushing case "Login Failure Spike" (id: case-001) to ServiceNow.` |
| `close_cases_case` | `success` | `User closed case "Login Failure Spike" (id: case-001).` |

### Security / Detection

| Event action | Outcome | `message` |
| --- | --- | --- |
| `create_security_rule` | `success` | `User created detection rule "Potential Credential Dumping" (id: rule-sec-001).` |
| `enable_security_rule` | `unknown` | `User is enabling detection rule "Potential Credential Dumping" (id: rule-sec-001).` |
| `acknowledge_security_alert` | `success` | `User acknowledged alert (id: alert-sec-999) for rule "Potential Credential Dumping".` |



## 6. Pre-Ship Checklist

- [ ] The action is user-initiated, not system-triggered or auto-fired
- [ ] The action changes state or represents a high-intent interaction, not a passive read
- [ ] Event name follows `{verb}_{context}_{noun}` in snake\_case
- [ ] Verb is from the approved list
- [ ] Context matches the canonical Kibana plugin name
- [ ] `message` uses correct tense relative to `event.outcome`
- [ ] `message` includes the object name (quoted) and ID where available
- [ ] `message` uses "User" as the subject in active voice
- [ ] No duplicate sub-event is emitted for the same user action
- [ ] Bulk operations use the `_bulk` suffix instead of emitting N individual events

