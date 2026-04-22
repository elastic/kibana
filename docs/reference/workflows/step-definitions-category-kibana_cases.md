<!-- To regenerate, run: node scripts/generate workflow-step-docs -->

# kibana.cases workflow steps

Step types in the **kibana.cases** category (`kibana.cases`).

## Cases - Add alerts to case

This step adds alert attachments to an existing case. Each alert requires an `alertId` and source `index`; rule metadata is optional.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `alerts` | array | Yes |
| `case_id` | string | Yes |

### Configuration

| Property | Type | Required |
| --- | --- | --- |
| `push-case` | boolean | Optional |

### Output

| Property | Type | Required |
| --- | --- | --- |
| `case` | object | Yes |

### Examples

#### Add alerts to case
```yaml
- name: add_alerts
  type: cases.addAlerts
  with:
    case_id: "abc-123-def-456"
    alerts:
      - alertId: "alert-1"
        index: ".alerts-security.alerts-default"
        rule:
          id: "rule-1"
          name: "Suspicious process"
```

## Cases - Add comment

This step appends a new user comment to the selected case.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `case_id` | string | Yes |
| `comment` | string | Yes |

### Configuration

| Property | Type | Required |
| --- | --- | --- |
| `push-case` | boolean | Optional |

### Output

| Property | Type | Required |
| --- | --- | --- |
| `case` | object | Yes |

### Examples

#### Add comment to a case
```yaml
- name: add_case_comment
  type: cases.addComment
  with:
    case_id: "abc-123-def-456"
    comment: "Investigating this incident now."
```

## Cases - Add events to case

This step adds event attachments to an existing case. Each event requires an `eventId` and source `index`.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `case_id` | string | Yes |
| `events` | array | Yes |

### Configuration

| Property | Type | Required |
| --- | --- | --- |
| `push-case` | boolean | Optional |

### Output

| Property | Type | Required |
| --- | --- | --- |
| `case` | object | Yes |

### Examples

#### Add events to case
```yaml
- name: add_events
  type: cases.addEvents
  with:
    case_id: "abc-123-def-456"
    events:
      - eventId: "event-1"
        index: ".ds-logs-*"
```

## Cases - Add observables to case

This step adds observables to an existing case using `typeKey`, `value`, and optional description fields.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `case_id` | string | Yes |
| `observables` | array | Yes |

### Configuration

| Property | Type | Required |
| --- | --- | --- |
| `push-case` | boolean | Optional |

### Output

| Property | Type | Required |
| --- | --- | --- |
| `case` | object | Yes |

### Examples

#### Add observables to case
```yaml
- name: add_observables
  type: cases.addObservables
  with:
    case_id: "abc-123-def-456"
    observables:
      - typeKey: "observable-type-ipv4"
        value: "10.0.0.8"
        description: "Source IP"
```

## Cases - Add tag to case

This step adds tags to an existing case.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `case_id` | string | Yes |
| `tags` | array | Yes |

### Configuration

| Property | Type | Required |
| --- | --- | --- |
| `push-case` | boolean | Optional |

### Output

| Property | Type | Required |
| --- | --- | --- |
| `case` | object | Yes |

### Examples

#### Set case tags
```yaml
- name: set_case_tags
  type: cases.addTags
  with:
    case_id: "abc-123-def-456"
    tags: ["investigation", "high-priority"]
```

## Cases - Assign case

This step assigns the specified users to an existing case.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `assignees` | array | Yes |
| `case_id` | string | Yes |
| `version` | string | Optional |

### Configuration

| Property | Type | Required |
| --- | --- | --- |
| `push-case` | boolean | Optional |

### Output

| Property | Type | Required |
| --- | --- | --- |
| `case` | object | Yes |

### Examples

#### Assign users to case
```yaml
- name: assign_case_users
  type: cases.assignCase
  with:
    case_id: "abc-123-def-456"
    assignees:
      - uid: "user-123"
      - uid: "user-456"
```

## Cases - Close case

This step closes an existing case by setting its status to `closed`. If version is not specified, the latest case version is resolved automatically.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `case_id` | string | Yes |
| `version` | string | Optional |

### Configuration

| Property | Type | Required |
| --- | --- | --- |
| `push-case` | boolean | Optional |

### Output

| Property | Type | Required |
| --- | --- | --- |
| `case` | object | Yes |

### Examples

#### Close a case
```yaml
- name: close_case
  type: cases.closeCase
  with:
    case_id: "abc-123-def-456"
```

## Cases - Create case

This step creates a new case in the cases system. You can specify title, description, tags, assignees, severity, category, connector configuration, sync settings, and custom fields. The step returns the complete created case object.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `assignees` | array | Optional |
| `category` | string | Optional |
| `customFields` | array | Optional |
| `description` | string | Yes |
| `owner` | string | Yes |
| `settings` | object | Optional |
| `severity` | string | Optional |
| `tags` | array | Optional |
| `title` | string | Yes |

### Configuration

| Property | Type | Required |
| --- | --- | --- |
| `connector-id` | string | Optional |
| `push-case` | boolean | Optional |

### Output

| Property | Type | Required |
| --- | --- | --- |
| `case` | object | Yes |

### Examples

#### Basic case creation
```yaml
- name: create_security_case
  type: cases.createCase
  with:
    title: "Security incident detected"
    description: "Suspicious activity detected in system logs"
    tags: ["security", "incident", "automated"]
    owner: "securitySolution"
    severity: "critical"
    settings:
      syncAlerts: true
      autoExtractObersvables: true
```

#### Using data from previous steps
```yaml
- name: analyze_alerts
  type: elasticsearch.search
  with:
    index: ".alerts-*"
    query:
      match:
        kibana.alert.severity: "critical"

- name: create_case_from_alerts
  type: cases.createCase
  with:
    title: "Automated case from critical alerts"
    description: ${{ "Found " + steps.analyze_alerts.output.hits.total.value + " critical alerts" }}
    tags: ["automated", "critical-alerts"]
    owner: "securitySolution"
    severity: "critical"
    settings:
      syncAlerts: true
```

## Cases - Delete cases

This step deletes the specified cases, including their comments and user action history.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `case_ids` | array | Yes |

### Output

| Property | Type | Required |
| --- | --- | --- |
| `case_ids` | array | Yes |

### Examples

#### Delete multiple cases
```yaml
- name: delete_cases
  type: cases.deleteCases
  with:
    case_ids:
      - "abc-123-def-456"
      - "ghi-789-jkl-012"
```

## Cases - Delete observable

This step deletes the specified observable from the case. The step echoes back the case_id and observable_id that were removed.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `case_id` | string | Yes |
| `observable_id` | string | Yes |

### Output

| Property | Type | Required |
| --- | --- | --- |
| `case_id` | string | Yes |
| `observable_id` | string | Yes |

### Examples

#### Remove a false-positive observable
```yaml
- name: delete_observable
  type: cases.deleteObservable
  with:
    case_id: "abc-123-def-456"
    observable_id: "obs-789"
```

#### Delete observable
```yaml
- name: remove_fp_ioc
  type: cases.deleteObservable
  with:
    case_id: ${{ steps.create_case.output.case.id }}
    observable_id: ${{ steps.add_observables.output.case.observables[0].id }}

- name: close_case
  type: cases.closeCase
  with:
    case_id: ${{ steps.remove_fp_ioc.output.case_id }}
```

## Cases - Find cases

This step searches cases and returns matching results, including pagination metadata and case status counters.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `assignees` | string | Optional |
| `category` | string | Optional |
| `customFields` | object | Optional |
| `defaultSearchOperator` | string | Optional |
| `from` | string | Optional |
| `owner` | string | Optional |
| `page` | integer | Yes |
| `perPage` | integer | Yes |
| `reporters` | string | Optional |
| `search` | string | Optional |
| `searchFields` | unknown | Optional |
| `severity` | string | Optional |
| `sortField` | string | Optional |
| `sortOrder` | string | Optional |
| `status` | string | Optional |
| `tags` | string | Optional |
| `to` | string | Optional |

### Output

| Property | Type | Required |
| --- | --- | --- |
| `cases` | array | Yes |
| `count_closed_cases` | integer | Yes |
| `count_in_progress_cases` | integer | Yes |
| `count_open_cases` | integer | Yes |
| `page` | integer | Yes |
| `per_page` | integer | Yes |
| `total` | integer | Yes |

### Examples

#### Basic case search
```yaml
- name: find_cases
  type: cases.findCases
  with:
    owner: "securitySolution"
    search: "critical incident"
```

#### Filter and sort found cases
```yaml
- name: find_open_cases
  type: cases.findCases
  with:
    owner: "securitySolution"
    status: "open"
    severity: ["high", "critical"]
    tags: ["investigation"]
    sortField: "updatedAt"
    sortOrder: "desc"
    page: 1
    perPage: 20
```

## Cases - Find similar cases

This step returns cases similar to the given case, based on shared observables, with pagination metadata.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `case_id` | string | Yes |
| `page` | integer | Yes |
| `perPage` | integer | Yes |

### Output

| Property | Type | Required |
| --- | --- | --- |
| `cases` | array | Yes |
| `page` | integer | Yes |
| `per_page` | integer | Yes |
| `total` | integer | Yes |

### Examples

#### Find similar cases
```yaml
- name: find_similar_cases
  type: cases.findSimilarCases
  with:
    case_id: "abc-123-def-456"
    page: 1
    perPage: 20
```

## Cases - Get all case attachments

This step fetches every attachment associated with a case without pagination. Use this when you need the complete set of attachments for decisioning — for example, checking evidence before closing or escalating.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `case_id` | string | Yes |

### Output

| Property | Type | Required |
| --- | --- | --- |
| `attachments` | array | Yes |

### Examples

#### Retrieve all attachments for a case
```yaml
- name: get_all_attachments
  type: cases.getAllAttachments
  with:
    case_id: "abc-123-def-456"
```

#### Inspect evidence before closing
```yaml
- name: get_evidence
  type: cases.getAllAttachments
  with:
    case_id: ${{ steps.create_case.output.case.id }}

- name: close_case
  type: cases.closeCase
  if: ${{ steps.get_evidence.output.attachments.length > 0 }}
  with:
    case_id: ${{ steps.create_case.output.case.id }}
```

## Cases - Get case by ID

This step retrieves a complete case object from the cases system using its ID. You can optionally include comments and attachments in the response.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `case_id` | string | Yes |
| `include_comments` | boolean | Yes |

### Output

| Property | Type | Required |
| --- | --- | --- |
| `case` | object | Yes |

### Examples

#### Basic usage
```yaml
- name: get_case
  type: cases.getCase
  with:
    case_id: "abc-123-def-456"
```

#### With comments included
```yaml
- name: get_case_with_comments
  type: cases.getCase
  with:
    case_id: "abc-123-def-456"
    include_comments: true
```

#### Using case from previous step
```yaml
- name: find_cases
  type: cases.findCases
  with:
    search_term: "critical incident"

- name: get_first_case
  type: cases.getCase
  with:
    case_id: ${{ steps.find_cases.output.cases[0].id }}
    include_comments: true
```

## Cases - Get cases

This step retrieves up to 1000 cases in a single request. Any IDs that could not be fetched are reported in the errors array. Use this to avoid N sequential get operations in fan-out workflows.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `case_ids` | array | Yes |

### Output

| Property | Type | Required |
| --- | --- | --- |
| `cases` | array | Yes |
| `errors` | array | Yes |

### Examples

#### Batch-retrieve multiple cases
```yaml
- name: get_cases
  type: cases.getCases
  with:
    case_ids:
      - "abc-123-def-456"
      - "bcd-234-efg-567"
```

#### Fan-out: find related cases then retrieve them all at once
```yaml
- name: find_by_alert
  type: cases.getCasesByAlertId
  with:
    alert_id: ${{ trigger.alert.id }}

- name: get_all_related_cases
  type: cases.getCases
  with:
    case_ids: ${{ steps.find_by_alert.output.cases.map(c => c.id) }}
```

## Cases - Get cases by alert ID

This step returns all cases that have the given alert attached. Use it to check for duplicates before creating a new case, or to fan-out work across multiple existing cases. An optional owner filter narrows results to a specific solution.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `alert_id` | string | Yes |
| `owner` | string | Optional |

### Output

| Property | Type | Required |
| --- | --- | --- |
| `cases` | array | Yes |

### Examples

#### Check if alert already belongs to a case
```yaml
- name: get_cases_for_alert
  type: cases.getCasesByAlertId
  with:
    alert_id: "550e8400-e29b-41d4-a716-446655440000"
```

#### Filter by owner
```yaml
- name: get_security_cases_for_alert
  type: cases.getCasesByAlertId
  with:
    alert_id: "550e8400-e29b-41d4-a716-446655440000"
    owner: "securitySolution"
```

#### Route alert to existing case or create a new one
```yaml
- name: check_existing_cases
  type: cases.getCasesByAlertId
  with:
    alert_id: ${{ trigger.alert.id }}
    owner: "securitySolution"

- name: create_case_if_none
  type: cases.createCase
  if: ${{ steps.check_existing_cases.output.cases.length === 0 }}
  with:
    title: "New incident"
    owner: "securitySolution"
```

## Cases - Set case description

This step sets only the description field of an existing case. If version is not specified, the latest case version is resolved automatically.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `case_id` | string | Yes |
| `description` | string | Yes |
| `version` | string | Optional |

### Configuration

| Property | Type | Required |
| --- | --- | --- |
| `push-case` | boolean | Optional |

### Output

| Property | Type | Required |
| --- | --- | --- |
| `case` | object | Yes |

### Examples

#### Set case description
```yaml
- name: set_case_description
  type: cases.setDescription
  with:
    case_id: "abc-123-def-456"
    description: "Updated timeline and investigation findings."
```

## Cases - Set case severity

This step sets only the severity field of an existing case. If version is not specified, the latest case version is resolved automatically.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `case_id` | string | Yes |
| `severity` | string | Yes |
| `version` | string | Optional |

### Configuration

| Property | Type | Required |
| --- | --- | --- |
| `push-case` | boolean | Optional |

### Output

| Property | Type | Required |
| --- | --- | --- |
| `case` | object | Yes |

### Examples

#### Set case severity
```yaml
- name: set_case_severity
  type: cases.setSeverity
  with:
    case_id: "abc-123-def-456"
    severity: "high"
```

## Cases - Set case status

This step sets only the status field of an existing case. If version is not specified, the latest case version is resolved automatically.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `case_id` | string | Yes |
| `status` | string | Yes |
| `version` | string | Optional |

### Configuration

| Property | Type | Required |
| --- | --- | --- |
| `push-case` | boolean | Optional |

### Output

| Property | Type | Required |
| --- | --- | --- |
| `case` | object | Yes |

### Examples

#### Set case status
```yaml
- name: set_case_status
  type: cases.setStatus
  with:
    case_id: "abc-123-def-456"
    status: "in-progress"
```

## Cases - Set case title

This step sets only the title field of an existing case. If version is not specified, the latest case version is resolved automatically.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `case_id` | string | Yes |
| `title` | string | Yes |
| `version` | string | Optional |

### Configuration

| Property | Type | Required |
| --- | --- | --- |
| `push-case` | boolean | Optional |

### Output

| Property | Type | Required |
| --- | --- | --- |
| `case` | object | Yes |

### Examples

#### Set case title
```yaml
- name: set_case_title
  type: cases.setTitle
  with:
    case_id: "abc-123-def-456"
    title: "Updated incident title"
```

## Cases - Set category on a case

This step sets the category on an existing case.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `case_id` | string | Yes |
| `category` | string | Yes |
| `version` | string | Optional |

### Configuration

| Property | Type | Required |
| --- | --- | --- |
| `push-case` | boolean | Optional |

### Output

| Property | Type | Required |
| --- | --- | --- |
| `case` | object | Yes |

### Examples

#### Set case category
```yaml
- name: set_case_category
  type: cases.setCategory
  with:
    case_id: "abc-123-def-456"
    category: "Malware"
```

## Cases - Unassign case

This step removes the specified assignees from an existing case. Specify an empty array to clear all assignees.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `assignees` | array | Yes |
| `case_id` | string | Yes |
| `version` | string | Optional |

### Configuration

| Property | Type | Required |
| --- | --- | --- |
| `push-case` | boolean | Optional |

### Output

| Property | Type | Required |
| --- | --- | --- |
| `case` | object | Yes |

### Examples

#### Unassign specific users from a case
```yaml
- name: unassign_case_users
  type: cases.unassignCase
  with:
    case_id: "abc-123-def-456"
    assignees:
      - uid: "user-123"
```

#### Unassign everyone from a case
```yaml
- name: unassign_all_case_users
  type: cases.unassignCase
  with:
    case_id: "abc-123-def-456"
    assignees: null
```

## Cases - Update case

This step updates a case using the specified fields. If a version is specified, it is used directly. Otherwise, the step fetches the case to resolve the latest version before updating.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `case_id` | string | Yes |
| `updates` | object | Yes |
| `version` | string | Optional |

### Configuration

| Property | Type | Required |
| --- | --- | --- |
| `push-case` | boolean | Optional |

### Output

| Property | Type | Required |
| --- | --- | --- |
| `case` | object | Yes |

### Examples

#### Update case status and severity
```yaml
- name: update_case
  type: cases.updateCase
  with:
    case_id: "abc-123-def-456"
    updates:
      status: "in-progress"
      severity: "high"
```

## Cases - Update cases

This step updates multiple cases at once. Each case can specify a version directly or let the step fetch the latest version before applying updates.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `cases` | array | Yes |

### Configuration

| Property | Type | Required |
| --- | --- | --- |
| `push-case` | boolean | Optional |

### Output

| Property | Type | Required |
| --- | --- | --- |
| `cases` | array | Yes |

### Examples

#### Update multiple cases
```yaml
- name: update_cases
  type: cases.updateCases
  with:
    cases:
      - case_id: "abc-123-def-456"
        updates:
          status: "in-progress"
      - case_id: "ghi-789-jkl-012"
        updates:
          severity: "high"
```

#### Update multiple cases with optional versions
```yaml
- name: update_cases_with_versions
  type: cases.updateCases
  with:
    cases:
      - case_id: "abc-123-def-456"
        version: "WzQ3LDFd"
        updates:
          title: "Use provided version"
      - case_id: "ghi-789-jkl-012"
        updates:
          title: "Resolve version automatically"
```

## Cases - Update observable

This step updates an observable that already exists on a case. Provide the case ID, the observable ID, the new value, and an optional description. The updated case is returned.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `case_id` | string | Yes |
| `description` | string | Optional |
| `observable_id` | string | Yes |
| `value` | string | Yes |

### Output

| Property | Type | Required |
| --- | --- | --- |
| `case` | object | Yes |

### Examples

#### Update observable value and description
```yaml
- name: update_observable
  type: cases.updateObservable
  with:
    case_id: "abc-123-def-456"
    observable_id: "obs-789"
    value: "10.0.0.42"
    description: "Updated source IP after investigation"
```

#### Clear observable description
```yaml
- name: clear_description
  type: cases.updateObservable
  with:
    case_id: "abc-123-def-456"
    observable_id: "obs-789"
    value: "10.0.0.42"
    description: null
```
