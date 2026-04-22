<!-- To regenerate, run: node scripts/generate workflow-step-docs -->

# Data workflow steps

Step types in the **Data** category (`data`).

## Aggregate Collection

Group items by one or more keys and compute summary metrics per group.

### Supported Operations

- **count** - Number of items in each group (no field needed)
- **sum** - Sum of numeric values
- **avg** - Average of numeric values
- **min** - Minimum value (numbers and dates)
- **max** - Maximum value (numbers and dates)

### Basic Usage

```yaml
- name: summarize-by-status
  type: data.aggregate
  items: "${{ steps.fetch_tickets.output }}"
  with:
    group_by:
      - "status"
    metrics:
      - name: "count"
        operation: "count"
      - name: "avg_age"
        operation: "avg"
        field: "age_days"
      - name: "max_severity"
        operation: "max"
        field: "severity"
```

### With Ordering and Limit

```yaml
- name: top-categories
  type: data.aggregate
  items: "${{ steps.fetch_products.output }}"
  with:
    group_by:
      - "category"
    metrics:
      - name: "count"
        operation: "count"
      - name: "total_revenue"
        operation: "sum"
        field: "price"
    order_by: "total_revenue"
    order: "desc"
    limit: 5
```

### With Bucketed Aggregation

```yaml
- name: age-distribution
  type: data.aggregate
  items: "${{ steps.fetch_users.output }}"
  with:
    group_by:
      - "department"
    metrics:
      - name: "count"
        operation: "count"
    buckets:
      field: "age"
      ranges:
        - to: 30
          label: "junior"
        - from: 30
          to: 50
          label: "mid"
        - from: 50
          label: "senior"
```

### Input

| Property | Type | Required |
| --- | --- | --- |
| `buckets` | object | Optional |
| `group_by` | array | Yes |
| `limit` | number | Optional |
| `metrics` | array | Yes |
| `order` | string | Yes |
| `order_by` | string | Optional |

### Configuration

| Property | Type | Required |
| --- | --- | --- |
| `items` | unknown | Yes |

## Concat Arrays

Combine multiple arrays into a single array, preserving order.

### Basic Usage

```yaml
- name: merge-tags
  type: data.concat
  arrays:
    - "${{ inputs.user_tags }}"
    - ["policy:all", "automated"]
    - "${{ steps.fetch_defaults.output }}"
```

### With Deduplication

```yaml
- name: unique-recipients
  type: data.concat
  arrays:
    - "${{ steps.team_a.output.emails }}"
    - "${{ steps.team_b.output.emails }}"
  with:
    dedupe: true
```

### With Flattening

```yaml
- name: flatten-nested
  type: data.concat
  arrays:
    - [["a", "b"], ["c"]]
    - [["d"]]
  with:
    flatten: true
```

### Output

Returns a single array containing all items from the input arrays in order.

### Limits

- Maximum 50 input arrays
- Maximum 100,000 total items in the result


### Input

| Property | Type | Required |
| --- | --- | --- |
| `dedupe` | boolean | Yes |
| `flatten` | boolean | Yes |

### Configuration

| Property | Type | Required |
| --- | --- | --- |
| `arrays` | array | Yes |

## Deduplicate Collection

Remove duplicate items from an array based on one or more unique key fields.

### Basic Usage

```yaml
- name: unique-users
  type: data.dedupe
  items: "${{ steps.fetch_users.output }}"
  strategy: "keep_first"
  with:
    keys: 
      - "email"
```

### Examples

#### Single Key Deduplication

Remove duplicates based on a single field:

```yaml
- name: unique-emails
  type: data.dedupe
  items: "${{ steps.get_recipients.output }}"
  with:
    keys: 
      - "email"
```

#### Multiple Key Deduplication

Remove duplicates based on a combination of fields:

```yaml
- name: unique-user-events
  type: data.dedupe
  items: "${{ steps.fetch_events.output }}"
  strategy: "keep_first"
  with:
    keys:
      - "user_id"
      - "event_type"
```

#### Keep Last Strategy

Keep the last occurrence instead of the first:

```yaml
- name: latest-status-per-user
  type: data.dedupe
  items: "${{ steps.fetch_status_updates.output }}"
  strategy: "keep_last"
  with:
    keys:
      - "user_id"
```

### Output

Returns an array with duplicate items removed based on the specified keys.

### Notes

- If a key doesn't exist in an item, it's treated as `undefined` for comparison
- Empty arrays are returned as-is
- The order of items is preserved (relative to the chosen strategy)


### Input

| Property | Type | Required |
| --- | --- | --- |
| `keys` | array | Yes |

### Configuration

| Property | Type | Required |
| --- | --- | --- |
| `items` | array | Yes |
| `strategy` | string | Yes |

## Extract with Regex

The data.regexExtract step extracts structured data from text using regular expression capture groups. It supports both named groups and numbered groups, and can process single strings or arrays.

**Security Note**: Complex regex patterns can cause performance issues (ReDoS - Regular Expression Denial of Service). The step enforces a maximum input length of 100KB per string. Avoid patterns with nested quantifiers like (a+)+, (a*)+, or (a|a)* which can cause catastrophic backtracking and hang the server.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `fields` | object | Yes |
| `flags` | string | Optional |
| `pattern` | string | Yes |

### Configuration

| Property | Type | Required |
| --- | --- | --- |
| `errorIfNoMatch` | boolean | Yes |
| `source` | unknown | Yes |

### Examples

#### Extract using named capture groups
```yaml
- name: parse-log-line
  type: data.regexExtract
  source: "${{ steps.fetch_logs.output.message }}"
  with:
    pattern: "^(?<timestamp>\\d{4}-\\d{2}-\\d{2}) (?<level>\\w+) (?<msg>.*)$"
    fields:
      timestamp: "timestamp"
      level: "level"
      msg: "msg"

# Output: { timestamp: "2024-01-15", level: "ERROR", msg: "Connection failed" }
```

#### Extract using numbered capture groups
```yaml
- name: parse-version
  type: data.regexExtract
  source: "${{ steps.get_version.output }}"
  with:
    pattern: "(\\d+)\\.(\\d+)\\.(\\d+)"
    fields:
      major: "$1"
      minor: "$2"
      patch: "$3"

# Input: "v1.2.3"
# Output: { major: "1", minor: "2", patch: "3" }
```

#### Process array of strings
```yaml
- name: parse-multiple-logs
  type: data.regexExtract
  source: "${{ steps.fetch_logs.output }}"
  with:
    pattern: "\\[(?<level>\\w+)\\] (?<message>.*)"
    fields:
      level: "level"
      message: "message"

# Input: ["[INFO] Started", "[ERROR] Failed"]
# Output: [{ level: "INFO", message: "Started" }, { level: "ERROR", message: "Failed" }]
```

#### Handle no match with error
```yaml
- name: parse-strict
  type: data.regexExtract
  source: "${{ steps.input.output }}"
  errorIfNoMatch: true
  with:
    pattern: "ID: (\\d+)"
    fields:
      id: "$1"

# If pattern doesn't match, step returns an error
```

#### Case-insensitive extraction
```yaml
- name: parse-flexible
  type: data.regexExtract
  source: "${{ steps.input.output }}"
  with:
    pattern: "error: (.*)"
    fields:
      error: "$1"
    flags: "i"

# Matches "Error:", "ERROR:", "error:", etc.
```

## Filter Collection

The data.filter step filters arrays using Kibana Query Language (KQL) conditions. Use `item.field` to reference item properties and `index` to access the item's position. Always returns an array of matching items. Use `limit` to cap the number of matches returned.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `condition` | string | Yes |
| `limit` | number | Optional |

### Configuration

| Property | Type | Required |
| --- | --- | --- |
| `items` | unknown | Yes |

### Examples

#### Filter by single field
```yaml
- name: get-active-incidents
  type: data.filter
  items: "${{ steps.fetch_incidents.output }}"
  with:
    condition: "item.state: active"

# Output: Array of items where state equals "active"
```

#### Filter with complex KQL condition
```yaml
- name: filter-critical-alerts
  type: data.filter
  items: "${{ steps.fetch_alerts.output }}"
  with:
    condition: "item.status: active AND item.severity > 2"

# Output: Array of active alerts with severity greater than 2
```

#### Filter with limit for performance
```yaml
- name: get-recent-errors
  type: data.filter
  items: "${{ steps.fetch_logs.output }}"
  with:
    condition: "item.level: error"
    limit: 10

# Output: First 10 matching items (early exit optimization)
```

#### Chain filter with count using Liquid
```yaml
- name: filter-enabled
  type: data.filter
  items: "${{ steps.fetch_data.output }}"
  with:
    condition: "item.enabled: true"

- name: log-count
  type: console
  with:
    message: "Matched {{steps.filter-enabled.output | size}} out of {{steps.fetch_data.output | size}} items"
```

#### Filter using index
```yaml
- name: get-first-ten
  type: data.filter
  items: "${{ steps.fetch_items.output }}"
  with:
    condition: "index < 10"

# Output: First 10 items from the array
```

#### Filter with wildcards
```yaml
- name: find-error-messages
  type: data.filter
  items: "${{ steps.fetch_logs.output }}"
  with:
    condition: "item.message: *error* OR item.message: *failed*"

# Output: Items where message contains "error" or "failed"
```

## Find First Match

The data.find step finds the first item in an array matching a KQL condition. Use `item.field` to reference item properties and `index` to access the item's position. Always returns `{ item, index }`. Use `errorIfEmpty: true` to return an error instead of null when no match is found.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `condition` | string | Yes |
| `errorIfEmpty` | boolean | Optional |

### Configuration

| Property | Type | Required |
| --- | --- | --- |
| `items` | unknown | Yes |

### Output

| Property | Type | Required |
| --- | --- | --- |
| `index` | number | Yes |
| `item` | unknown | Yes |

### Examples

#### Find first matching item
```yaml
- name: find-primary-owner
  type: data.find
  items: "${{ steps.fetch_users.output }}"
  with:
    condition: "item.role: primary_owner"

# Output: { item: { role: "primary_owner", ... }, index: 2 }
# Or if no match: { item: null, index: null }
```

#### Find with complex condition
```yaml
- name: find-critical-alert
  type: data.find
  items: "${{ steps.fetch_alerts.output }}"
  with:
    condition: "item.status: active AND item.severity >= 4"

# Output: First active alert with severity 4 or higher
```

#### Error if no match found
```yaml
- name: find-required-config
  type: data.find
  items: "${{ steps.fetch_configs.output }}"
  with:
    condition: "item.name: production"
    errorIfEmpty: true

# Returns error if no config with name "production" is found
```

#### Access the matched item and its index
```yaml
- name: find-enabled
  type: data.find
  items: "${{ steps.fetch_data.output }}"
  with:
    condition: "item.enabled: true"

- name: log-result
  type: console
  with:
    message: "Found item at index {{steps.find-enabled.output.index}}: {{steps.find-enabled.output.item | json}}"
```

#### Find using index
```yaml
- name: find-after-index
  type: data.find
  items: "${{ steps.fetch_items.output }}"
  with:
    condition: "index >= 10 AND item.status: pending"

# Output: First pending item at index 10 or later
```

#### Find with wildcards
```yaml
- name: find-error-log
  type: data.find
  items: "${{ steps.fetch_logs.output }}"
  with:
    condition: "item.level: error AND item.message: *timeout*"

# Output: First error log containing "timeout" in the message
```

## Map Collection

The data.map step transforms arrays or single objects by applying a mapping configuration. For arrays, it maps each item and returns an array. For objects, it maps the single object and returns an object. Use `{{ item.field }}` to reference the current item and `{{ index }}` to access the item's position. The output is accessible via `{{ steps.stepName.output }}`.

To map nested arrays, add a `$map` key inside a nested field object with the form `$map: { items: "${{ ... }}", item?: "...", index?: "..." }`. The `items` value is a Liquid template expression rendered using the current context (the same rendering applied to all other fields), and each element is bound to the name given by `item` (defaults to `"item"`). The iteration index is bound to the name given by `index` (defaults to `"index"`), and parent variables remain in scope. Nested objects without `$map` produce literal object output. 
If nested `items` value in the source data resolves to any non-array value (including `null` or `undefined`), an empty array (`[]`) is going to be returned to guarantee output consistency. Nested recursion depth is limited to 10 levels.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `fields` | object | Yes |

### Configuration

| Property | Type | Required |
| --- | --- | --- |
| `items` | unknown | Yes |

### Examples

#### Rename and project fields
```yaml
- name: normalize-users
  type: data.map
  items: "${{ steps.fetch_users.output }}"
  with:
    fields:
      id: "${{ item.objectId }}"
      email: "${{ item.mail }}"
      display_name: "${{ item.givenName }} ${{ item.surname }}"
```

#### Compute conditional fields with Liquid
```yaml
- name: enrich-orders
  type: data.map
  items: "${{ steps.get_orders.output.value }}"
  with:
    fields:
      order_id: "${{ item.id }}"
      total: "${{ item.price * item.quantity }}"
      status: >-
        {% if item.paid == true %}paid{% else %}pending{% endif %}
      discount: "${{ item.price * 0.1 }}"
```

#### Add static fields and use index
```yaml
- name: tag-items
  type: data.map
  items: "${{ steps.fetch_data.output.items }}"
  with:
    fields:
      position: "${{ index }}"
      name: "${{ item.name }}"
      source: "api"
      processed_at: "${{ workflow.startedAt }}"
```

#### Complex transformation from Active Directory
```yaml
- name: normalize-ad-users
  type: data.map
  items: "${{ steps.fetch_ad_users.output.value }}"
  with:
    fields:
      id: "${{ item.objectId }}"
      email: "${{ item.mail }}"
      display_name: "${{ item.givenName }} ${{ item.surname }}"
      department: "${{ item.department }}"
      source: "active_directory"
      status: >-
        {% if item.accountEnabled == true %}active{% else %}suspended{% endif %}
      
# Access the mapped array in subsequent steps
- name: use-normalized-data
  type: log
  with:
    message: "Processed ${{ steps.normalize-ad-users.output | size }} users"
```

#### Normalize API response structure
```yaml
- name: reshape-github-issues
  type: data.map
  items: "${{ steps.fetch_issues.output }}"
  with:
    fields:
      issue_id: "${{ item.id }}"
      title: "${{ item.title }}"
      author: "${{ item.user.login }}"
      state: "${{ item.state }}"
      created: "${{ item.created_at }}"
      url: "${{ item.html_url }}"
```

#### Map a single object
```yaml
- name: reshape-user-profile
  type: data.map
  items: "${{ steps.fetch_user.output }}"
  with:
    fields:
      user_id: "${{ item.id }}"
      full_name: "${{ item.firstName }} ${{ item.lastName }}"
      email: "${{ item.email }}"
      is_active: "${{ item.status == 'active' }}"

# When items is an object, output is also an object
- name: use-mapped-user
  type: log
  with:
    message: "User: ${{ steps.reshape-user-profile.output.full_name }}"
```

#### Recursive array mapping with $map
```yaml
- name: prune-nested-data
  type: data.map
  items: "${{ steps.fetch_data.output }}"
  with:
    fields:
      id: "${{ item.id }}"
      name: "${{ item.name }}"
      tags:
        $map: { items: "${{ item.tags }}", item: "tag" }
        label: "${{ tag.label }}"
        color: "${{ tag.color }}"
        owner: "${{ item.name }}"
```

#### Multi-level recursion with $map
```yaml
- name: reshape-org
  type: data.map
  items: "${{ steps.fetch_org.output }}"
  with:
    fields:
      org_name: "${{ item.name }}"
      departments:
        $map: { items: "${{ item.departments }}", item: "dept" }
        dept_name: "${{ dept.name }}"
        employees:
          $map: { items: "${{ dept.employees }}", item: "emp" }
          name: "${{ emp.name }}"
          department: "${{ dept.name }}"
          org: "${{ item.name }}"
```

#### Nested $map with defaults (item/index omitted)
```yaml
- name: flatten-tags
  type: data.map
  items: "${{ steps.fetch_data.output }}"
  with:
    fields:
      id: "${{ item.id }}"
      tags:
        $map: { items: "${{ item.tags }}" }
        label: "${{ item.label }}"
        position: "${{ index }}"
```

#### Nested literal objects inside $map
```yaml
- name: enrich-tags
  type: data.map
  items: "${{ steps.fetch_data.output }}"
  with:
    fields:
      id: "${{ item.id }}"
      tags:
        $map: { items: "${{ item.tags }}", item: "tag" }
        label: "${{ tag.label }}"
        color: "${{ tag.color }}"
        owner:
          id: "${{ tag.user.id }}"
          name: "${{ tag.user.name }}"
```

## Parse JSON

Parse a JSON string into a structured object or array for use in downstream steps.

### Basic Usage

```yaml
- name: parse-response
  type: data.parseJson
  source: "${{ steps.http_request.output.body }}"
```

### Behavior

- If the source is already a structured type (object, array, number, boolean), it is returned as-is.
- If the source is a valid JSON string, it is parsed and returned.
- If the source is an invalid JSON string, the step returns an error with the parse location.

### Output

Returns the parsed value — an object, array, string, number, boolean, or null.

### Size Limits

Inputs larger than 10 MB are rejected to prevent excessive memory usage.


### Configuration

| Property | Type | Required |
| --- | --- | --- |
| `source` | unknown | Yes |

## Replace with Regex

The data.regexReplace step performs pattern-based text replacements using regular expressions. It supports backreferences, named groups, and can process single strings or arrays.

**Security Note**: Complex regex patterns can cause performance issues (ReDoS - Regular Expression Denial of Service). The step enforces a maximum input length of 100KB per string. Avoid patterns with nested quantifiers like (a+)+, (a*)+, or (a|a)* which can cause catastrophic backtracking and hang the server.

### Input

| Property | Type | Required |
| --- | --- | --- |
| `flags` | string | Optional |
| `pattern` | string | Yes |
| `replacement` | string | Yes |

### Configuration

| Property | Type | Required |
| --- | --- | --- |
| `detailed` | boolean | Yes |
| `source` | unknown | Yes |

### Examples

#### Simple text replacement
```yaml
- name: sanitize-message
  type: data.regexReplace
  source: "${{ steps.user_input.output.text }}"
  with:
    pattern: "\\b(password|secret|token)\\b"
    replacement: "***"
    flags: "gi"

# Input: "My password is secret"
# Output: "My *** is ***"
```

#### Replacement with backreferences
```yaml
- name: format-phone
  type: data.regexReplace
  source: "${{ steps.input.output }}"
  with:
    pattern: "(\\d{3})(\\d{3})(\\d{4})"
    replacement: "($1) $2-$3"

# Input: "5551234567"
# Output: "(555) 123-4567"
```

#### Process array of strings
```yaml
- name: clean-emails
  type: data.regexReplace
  source: "${{ steps.get_emails.output }}"
  with:
    pattern: "@old\\.domain\\.com"
    replacement: "@new.domain.com"

# Input: ["user1@old.domain.com", "user2@old.domain.com"]
# Output: ["user1@new.domain.com", "user2@new.domain.com"]
```

#### Global vs single replacement
```yaml
# Replace all occurrences
- name: replace-all
  type: data.regexReplace
  source: "${{ steps.input.output }}"
  with:
    pattern: "foo"
    replacement: "bar"
    flags: "g"

# Replace only first occurrence
- name: replace-first
  type: data.regexReplace
  source: "${{ steps.input.output }}"
  with:
    pattern: "foo"
    replacement: "bar"
```

#### Detailed output for observability
```yaml
- name: track-replacements
  type: data.regexReplace
  source: "${{ steps.input.output }}"
  detailed: true
  with:
    pattern: "error"
    replacement: "warning"
    flags: "gi"

# Output: 
# {
#   original: "Error occurred. Another error found.",
#   replaced: "warning occurred. Another warning found.",
#   matchCount: 2
# }

# Note: matchCount is only accurate when the global flag (g) is set.
# Without the global flag, matchCount will be 1 if there's a match, 0 otherwise.
```

#### Named group replacement
```yaml
- name: format-date
  type: data.regexReplace
  source: "${{ steps.input.output }}"
  with:
    pattern: "(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})"
    replacement: "$<month>/$<day>/$<year>"

# Input: "2024-01-15"
# Output: "01/15/2024"
```

## Stringify JSON

Convert a structured value (object, array, etc.) into a JSON string for transport or presentation.

### Basic Usage

```yaml
- name: stringify-payload
  type: data.stringifyJson
  source: "${{ steps.build_payload.output }}"
  with:
    pretty: false
```

### Pretty Print

```yaml
- name: debug-output
  type: data.stringifyJson
  source: "${{ steps.build_payload.output }}"
  with:
    pretty: true
```

### Output

Returns a JSON string representation of the source value.

### Error Handling

- Circular references produce a clear error message.
- Non-serializable values (e.g., functions) return an error.


### Input

| Property | Type | Required |
| --- | --- | --- |
| `pretty` | boolean | Yes |

### Configuration

| Property | Type | Required |
| --- | --- | --- |
| `source` | unknown | Yes |
