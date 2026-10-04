# Test Plan: Exceptions for ES|QL rules, existing behavior and exceptions on computed columns

## Overview

This test plan has two goals for the ES|QL rule type (`siem.esqlRule`). First, confirm that every exception that works today keeps working: exceptions on source fields, applied as a DSL filter on the `_query` request. Second, validate the new capability behind the experimental feature `esqlNativeExceptionsEnabled`: exceptions on computed (transient) columns of the ES|QL query, applied as `WHERE` stages at the end of the query, together with the rules for items that cannot be applied.

## Feature Background

An ES|QL rule applies exceptions as a DSL filter that Elasticsearch runs on the source documents before the rule's ES|QL pipeline. An exception cannot reference a column that the pipeline computes with `STATS`, `EVAL` or `RENAME`, because the column does not exist when the filter runs. The proposal keeps the DSL filter for source fields and adds `WHERE` stages at the end of the query for items whose fields are all computed output columns of a supported type. Items that can be evaluated in neither place are not applied; they are logged and, when a user could expect them to apply, reported as a rule warning. The design and the supported types are in `esql_exceptions_proposal.md`.

## Scope

**In scope:**
- Regression of every exception entry type and operator on source fields for the ES|QL rule type: "is", "is not", "is one of", "is not one of", "matches", "does not match", "exists", "does not exist", "is in list", "is not in list", and nested entries.
- Regression of rule-level behavior: multi-valued fields, date rounding, AND of entries and OR of items, aggregating rules, expired items, default and shared lists, rule preview, alert suppression.
- Exceptions on computed columns for the 11 supported column types and the four entry types (`match`, `match_any`, `wildcard`, `exists`) and their negative operators, including `text` columns that alias a source field (compared with `MATCH_PHRASE`) and the commands after which that comparison is not applied.
- Items that are not applied (`matches` on `text` columns, queries that use `LIMIT` or `STATS` with a `text` comparison, unsupported types, values that do not cast, list and nested entries, fields that exist nowhere, source fields the query drops) and how they are logged and reported.
- The limits (250 values per "is one of", 100 items at the end of the query), the feature flag, and the failure path when the fields cannot be inspected.
- Dependency data lifecycle: exception items deleted or edited between runs, mappings that change, rule queries that are edited.

**Out of scope:**
- Value lists as lookup indices with `LOOKUP JOIN`: a later iteration; value lists keep running through the DSL filter.
- In-memory filtering of large value lists: the ES|QL executor does not do it today and it is not part of this delivery.
- Applying source-field exceptions as a `WHERE` stage right after `FROM`: rejected in the proposal as too risky; the DSL filter stays.
- "matches" and "does not match" on `text` computed columns: not applied by design, because the DSL compares each analyzed token and ES|QL has no wildcard comparison by token after the query has run; a request to the ES|QL team is drafted (see the scenario about "matches" and "does not match" on a text computed column).
- Upgrade and migration scenarios: the change ships no mapping, saved-object, configuration key or navigation change (the flag is a constant in the experimental features list); confirm before publishing.
- CRUD of exception lists and items, and of rules: no new persisted object; existing objects are only read by the executor.
- Performance: outside the scope of the functional test plan.

## Terminology

| Term | Definition |
|---|---|
| Source field | A field that exists in the mappings of the indices in the rule's `FROM`, including keys below a `flattened` field. |
| Computed column (transient column) | A column that exists only in the output of the ES|QL query, created or renamed by `EVAL`, `STATS` or `RENAME`. |
| DSL filter | The Query DSL filter built from the exception items and sent with the `_query` request; it runs on the source documents before the query. |
| End of the query | The `| WHERE` stages that the executor appends after the rule query for items on computed columns. |
| Item and entry | An exception item holds one or more entries joined with AND; the items of a list are joined with OR. |

## Assumptions

- **License level:** ⚠️ Not confirmed. Use a license that allows ES|QL rules (trial or Enterprise for these runs).
- **User role:** A user who can create and edit rules and exception lists. No role matrix is tested (see Known Limitations).
- **Data setup:** A reference index with documents that have these fields: `host.name` (keyword), `user.name` (keyword), `message` (text), `process.pid` (long), `source.ip` (ip), `event.allowed` (boolean), `event.start` (date), `agent.version` (version), `labels` (flattened), `tags` (keyword, several values per document), `geo.loc` (geo_point) and `groups` (nested, with `name` and `role`). Documents are chosen per scenario so that one matches, one does not match and one lacks the field.
- **Feature flag:** `xpack.securitySolution.enableExperimental: ['esqlNativeExceptionsEnabled']` in `kibana.yml`, which needs a Kibana restart. All scenarios of "Exceptions on source fields keep working" run twice, once with the flag off and once with it on; the expected result is the same in both runs. The other areas run with the flag on unless a scenario says otherwise.
- **Deployment type:** Self-managed (stateful). Serverless and ECH are not verified.
- **Elasticsearch version:** ⚠️ The design was checked on an Elasticsearch 9.6 snapshot. The minimum version that supports `MV_CONTAINS`, `MV_LIKE` and `MV_IN_RANGE` is not confirmed; run the plan on every supported version before release.
- **Target version:** ⚠️ Not specified: please confirm before publishing (upgrade is recorded under Out of scope).

## Acceptance Criteria

No GitHub issue exists for this work. The criteria below are inferred from `esql_exceptions_proposal.md` and the implementation on the branch `esql-end-stage-exceptions`.

1. Every exception on a source field behaves as it does today: the DSL filter is built from the same items and excludes the same documents, with the feature on or off.
2. With the feature off, the executor makes no field lookup request and builds the same request as today.
3. With the feature on, an item whose fields are all source fields (or keys below a `flattened` field) stays in the DSL filter.
4. With the feature on, an item whose fields are all output columns of a supported type, and not source fields, is appended at the end of the query as a `| WHERE` stage placed before the final limit.
5. The supported column types are `keyword`, `integer`, `long`, `unsigned_long`, `double`, `boolean`, `ip`, `version`, `date` and `date_nanos` for "is", "is one of" and "exists" (and their negatives), and `keyword` for "matches" (and its negative). A `text` column supports "is", "is one of" and "exists" (and their negatives), compared with `MATCH_PHRASE` as the DSL `match_phrase` does, and does not support "matches".
6. Values are cast to the column type; a value that does not cast is not applied and does not exclude every row. Date values follow the rounding of the DSL.
7. An item that cannot be applied is removed from the DSL filter and is logged: at `debug` when its fields exist neither in the source nor in the output, at `warn` with a rule warning in every other case.
8. At most 100 items are applied at the end of the query and an "is one of" list has between 1 and 250 values there.
9. An item that compares a `text` column is applied only when every command of the rule query is `EVAL`, `RENAME`, `KEEP`, `DROP`, `WHERE`, `SORT` (without `LIMIT`), `DISSECT`, `GROK` or `MV_EXPAND`. With any other command (`LIMIT`, `STATS`, and others) the item is not applied, a warning names the command, and the other end-of-query items still apply. No request is made for this check.
10. If the field lookup or the output probe fails, every exception stays in the DSL filter and the rule shows the warning "Could not inspect the fields of the exceptions, so all exceptions use the DSL filter".
11. Expired items are not applied in either position.

## Known Limitations

- ⚠️ No GitHub issue is linked, so the Issue Clarity Assessment at the end of the plan is not applicable and the acceptance criteria are inferred from the proposal.
- ⚠️ The implementation was verified with unit tests and with a script against a live Elasticsearch (27 operator and type cases), but it has not been run through a Kibana instance with the flag on. The scenarios in this plan are the first end-to-end check.
- ⚠️ Behavior change to confirm with product: an item whose fields exist nowhere is removed from the DSL filter, so a negative operator such as "is not" on such a field no longer excludes every document. Scenarios "With the feature off, \"is not\" on a field that is not in the source indices excludes every document" and "An item whose fields are in neither the source nor the output is not applied and creates no warning" record both sides.
- ⚠️ The caps of 250 values and 100 items are new restrictions that apply only to the end of the query; the DSL filter has no such caps today.
- ⚠️ The area "Spaces and cross-cluster search (to confirm)" is included because rules are space-aware and the field inspection queries Elasticsearch indices, including remote ones. Confirm that both are in the release scope before executing it.
- ⚠️ The scenario "If the fields cannot be inspected, every exception stays in the DSL filter and the rule reports it" needs a failing field lookup, which is hard to cause by hand; it is best covered by an automated test with a failing Elasticsearch client.
- ⚠️ The commands after which Elasticsearch accepts a full-text function were observed on a 9.6 snapshot, and the list of accepted commands in the code comes from that. Run the `text` scenarios on every supported version. The check is conservative: a `text` comparison after `STATS` is not applied even when Elasticsearch would accept it.
- ⚠️ The minimum Elasticsearch version for the ES|QL functions used at the end of the query is not confirmed (see Assumptions).
- Required testing types: positive, negative, edge-case and error-handling scenarios are present in the first four areas. State-based coverage is in "Dependency data lifecycle". Performance, accessibility, i18n and visual testing are outside the scope of this skill.
- Optional sections not included: RBAC (the proposal does not change privileges) and multi-tenant (serverless is not in scope).
- Float and half-float columns computed from a source field are not covered because equality with typed decimals does not work at the end of the query; the types are listed as unsupported in the proposal.
- The team critical-workflows map for the Security Solution was applied: "Rule execution and alert generation" is P0, so scenarios whose failure would change which alerts a rule creates are P0.

## Test Scenarios

<details>
<summary><strong>Exceptions on source fields keep working</strong>: 25 scenarios (P0: 10, P1: 13, P2: 2)</summary>

#### Scenario: "is" excludes the documents that hold the value, for each supported field type

**Priority:** P0

**Automation coverage**: 1 API integration test (`x-pack/solutions/security/test/security_solution_api_integration/test_suites/detections_response/detection_engine/rule_execution_logic/esql/trial_license_complete_tier/esql.ts`: "with exceptions › should apply exceptions", an "is" entry on `client.ip` in a rule preview), partial: only the "is" operator on one field type. 2 unit tests (`x-pack/solutions/security/plugins/lists/server/services/exception_lists/build_exception_filter.test.ts`: "it should build boolean filter when operator is \"included\"", "it should build boolean filter when operator is \"excluded\"") (buildMatchClause), partial: they cover the DSL clause, not the rule result.
```gherkin
Scenario Outline: "is" on a source field
  Given an ES|QL rule whose query returns every document of the reference index
  And an exception item with the entry <field> is <value>
  When the rule runs
  Then no alert is created for the documents that hold <value> in <field>
  And an alert is created for every other document

  Examples:
    | field         | value                     |
    | host.name     | web-01                    |
    | message       | failed                    |
    | process.pid   | 4242                      |
    | source.ip     | 10.0.0.5                  |
    | event.allowed | true                      |
    | agent.version | 1.2.3                     |
    | labels.team   | red                       |
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: "is not" excludes the documents that do not hold the value, including those without the field

**Priority:** P0

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/lists/server/services/exception_lists/build_exception_filter.test.ts`: "it should build boolean filter when operator is \"included\"", "it should build boolean filter when operator is \"excluded\"") (buildMatchClause), partial: they cover the DSL clause, not the rule result.
```gherkin
Given an ES|QL rule whose query returns every document of the reference index
And an exception item with the entry host.name is not web-01
And one document has host.name web-01, one has host.name web-02 and one has no host.name
When the rule runs
Then an alert is created only for the document with host.name web-01
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: "is one of" excludes the documents that hold any of the values

**Priority:** P0

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/lists/server/services/exception_lists/build_exception_filter.test.ts`: "it should build boolean filter when operator is \"included\"", "it should build boolean filter when operator is \"excluded\"") (buildMatchAnyClause), partial: they cover the DSL clause, not the rule result.
```gherkin
Given an ES|QL rule whose query returns every document of the reference index
And an exception item with the entry host.name is one of web-01, web-02, web-03
And documents exist for web-01, web-02, web-03 and web-04
When the rule runs
Then an alert is created only for the web-04 document
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: "matches" excludes the documents whose value fits the pattern on keyword and text fields

**Priority:** P0

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/lists/server/services/exception_lists/build_exception_filter.test.ts`: "it should build wildcard filter when operator is \"included\"", "it should build boolean filter when operator is \"excluded\"") (buildWildcardClause), partial: they cover the DSL clause, not the rule result.
```gherkin
Scenario Outline: "matches" on a source field
  Given an ES|QL rule whose query returns every document of the reference index
  And an exception item with the entry <field> matches <pattern>
  When the rule runs
  Then no alert is created for the documents whose <field> fits <pattern>
  And an alert is created for every other document

  Examples:
    | field     | pattern | note                                           |
    | host.name | web-*   | the pattern applies to the whole keyword value |
    | message   | fail*   | the pattern applies to each analyzed token     |
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: "exists" excludes the documents that have the field

**Priority:** P0

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/lists/server/services/exception_lists/build_exception_filter.test.ts`: "it should build boolean filter when operator is \"included\"", "it should build boolean filter when operator is \"excluded\"") (buildExistsClause), partial: they cover the DSL clause, not the rule result.
```gherkin
Given an ES|QL rule whose query returns every document of the reference index
And an exception item with the entry user.name exists
And one document has user.name and one does not
When the rule runs
Then an alert is created only for the document without user.name
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: The entries of one item are combined with AND

**Priority:** P0

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/lists/server/services/exception_lists/build_exception_filter.test.ts`: "it should create filter with one item if only one exception item exists", "it should build exception item boolean filter from entries") (createOrClauses, buildExceptionItemFilter), partial: they cover the DSL clause, not the rule result.
```gherkin
Given an ES|QL rule whose query returns every document of the reference index
And one exception item with the entries host.name is web-01 and user.name is root
And documents exist with web-01 and root, with web-01 and alice, and with db-01 and root
When the rule runs
Then no alert is created for the web-01 and root document
And alerts are created for the other two documents
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: The items of a list are combined with OR

**Priority:** P0

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/lists/server/services/exception_lists/build_exception_filter.test.ts`: "it should create filter with one item if only one exception item exists", "it should build exception item boolean filter from entries") (createOrClauses, buildExceptionItemFilter), partial: they cover the DSL clause, not the rule result.
```gherkin
Given an ES|QL rule whose query returns every document of the reference index
And one exception item with the entry host.name is web-01
And a second exception item with the entry user.name is root
When the rule runs
Then no alert is created for the documents with host.name web-01 or with user.name root
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A value list excludes the documents whose value is in the list

**Priority:** P0

**Automation coverage**: 5 unit tests (`x-pack/solutions/security/plugins/lists/server/services/exception_lists/build_exception_filter.test.ts`: "it should build list filter when operator is \"included\"", "it should build boolean filter when operator is \"excluded\"", "it should build with a should clause when list is ip_range type", "it should return a filter when ip_range has exactly 200 dash entries", "it should return undefined when ip_range exceeds 200 dash entries") (buildListClause), partial: they cover the DSL clause, not the rule result.
```gherkin
Scenario Outline: "is in list" and "is not in list"
  Given an ES|QL rule whose query returns every document of the reference index
  And an exception item with the entry <field> <operator> a value list of type <list_type>
  When the rule runs
  Then the documents are excluded as <result>

  Examples:
    | field      | operator         | list_type | result                                     |
    | host.name  | is in list       | keyword   | those whose value is in the list           |
    | host.name  | is not in list   | keyword   | those whose value is not in the list       |
    | source.ip  | is in list       | ip        | those whose address is in the list         |
    | source.ip  | is in list       | ip_range  | those whose address is inside a listed range |
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: An exception on a source field changes the aggregates of an aggregating rule

**Priority:** P0

**Automation coverage**: No existing tests found covering this scenario.
```gherkin
Given an ES|QL rule with the query FROM reference | STATS events = COUNT(*) BY host.name | WHERE events > 1
And an exception item with the entry user.name is root
And the web-01 host has three events and one of them has user.name root
When the rule runs
Then the web-01 alert shows an events value of 2
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: Alerts are identical with the feature on and off when every exception is on a source field

**Priority:** P0

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/split_exception_items.test.ts`: "keeps an item on source fields in the DSL", "keeps items on a flattened key and on a nested field in the DSL", "keeps an item on a source field in the DSL even when the query outputs a column with that name"), partial: the unit tests cover the split decision, not the alerts.
```gherkin
Given an ES|QL rule and a list of exception items that are all on source fields
And the rule ran once with the feature off
When the feature is switched on and the rule runs again on the same data
Then the same documents are excluded
And the same alerts are created
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: "is not one of" excludes the documents that hold none of the values

**Priority:** P1

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/lists/server/services/exception_lists/build_exception_filter.test.ts`: "it should build boolean filter when operator is \"included\"", "it should build boolean filter when operator is \"excluded\"") (buildMatchAnyClause), partial: they cover the DSL clause, not the rule result.
```gherkin
Given an ES|QL rule whose query returns every document of the reference index
And an exception item with the entry host.name is not one of web-01, web-02
And documents exist for web-01, web-02, web-04 and a document without host.name
When the rule runs
Then alerts are created only for the web-01 and web-02 documents
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: "does not match" excludes the documents whose value does not fit the pattern

**Priority:** P1

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/lists/server/services/exception_lists/build_exception_filter.test.ts`: "it should build wildcard filter when operator is \"included\"", "it should build boolean filter when operator is \"excluded\"") (buildWildcardClause), partial: they cover the DSL clause, not the rule result.
```gherkin
Given an ES|QL rule whose query returns every document of the reference index
And an exception item with the entry host.name does not match web-*
And documents exist for web-01, db-01 and a document without host.name
When the rule runs
Then an alert is created only for the web-01 document
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: "does not exist" excludes the documents that lack the field

**Priority:** P1

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/lists/server/services/exception_lists/build_exception_filter.test.ts`: "it should build boolean filter when operator is \"included\"", "it should build boolean filter when operator is \"excluded\"") (buildExistsClause), partial: they cover the DSL clause, not the rule result.
```gherkin
Given an ES|QL rule whose query returns every document of the reference index
And an exception item with the entry user.name does not exist
And one document has user.name and one does not
When the rule runs
Then an alert is created only for the document with user.name
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A multi-valued field is excluded when any one of its values matches

**Priority:** P1

**Automation coverage**: No existing tests found covering this scenario.
```gherkin
Given an ES|QL rule whose query returns every document of the reference index
And an exception item with the entry tags is blue
And one document has tags red and blue, and one document has tags red and green
When the rule runs
Then an alert is created only for the document with tags red and green
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A date value excludes the unit that it names, and only the first day for a month or year value

**Priority:** P1

**Automation coverage**: No existing tests found covering this scenario.
```gherkin
Scenario Outline: "is" on a date field
  Given an ES|QL rule whose query returns every document of the reference index
  And an exception item with the entry event.start is <value>
  When the rule runs
  Then no alert is created for the documents dated within <covered>

  Examples:
    | value                    | covered                         |
    | 2026-09-30               | the whole day 2026-09-30        |
    | 2026-09-30T14            | the hour 14:00 to 14:59 UTC     |
    | 2026-09                  | the day 2026-09-01 only         |
    | 2026                     | the day 2026-01-01 only         |
    | 2026-09-30T14:00:00.123Z | that instant only               |
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A nested entry excludes a document only when one nested object satisfies every inner entry

**Priority:** P1

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/lists/server/services/exception_lists/build_exception_filter.test.ts`: "it should build nested filter when operator is \"included\"", "it should build nested filter when operator is \"excluded\"", "it should build nested filter with mixed entry types") (buildNestedClause), partial: they cover the DSL clause, not the rule result.
```gherkin
Given an ES|QL rule over an index where groups is a nested field
And a nested exception entry with groups.name is ops and groups.role is admin
And one document has a single group with name ops and role admin
And one document has the name ops in one group and the role admin in another group
When the rule runs
Then an alert is created only for the document whose values are in different groups
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A value list that cannot be processed is reported on the rule and the other exceptions still apply

**Priority:** P1

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/lists/server/services/exception_lists/build_exception_filter.test.ts`: "it should filter in list types we do support", "it should filter out list types we don't support") (filterOutUnprocessableValueLists), partial: they cover the filter builder, not the warning shown on the rule.
```gherkin
Given an ES|QL rule with an exception item on a value list of an unsupported type
And a second exception item with the entry host.name is web-01
When the rule runs
Then the rule shows a warning that names the unprocessed value list
And no alert is created for the web-01 documents
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: With the feature off, "is not" on a field that is not in the source indices excludes every document

**Priority:** P1

**Automation coverage**: No existing tests found covering this scenario.
```gherkin
Given the feature flag is off
And an ES|QL rule whose query returns every document of the reference index
And an exception item with the entry missing.field is not x
When the rule runs
Then no alert is created for any document
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A field type that Elasticsearch rejects fails the rule and creates no alert

**Priority:** P1

**Automation coverage**: No existing tests found covering this scenario.
```gherkin
Scenario Outline: Elasticsearch rejects the exception query
  Given an ES|QL rule whose query returns every document of the reference index
  And an exception item with the entry <field> <operator> <value>
  When the rule runs
  Then the rule status is failed with the Elasticsearch error
  And no alert is created

  Examples:
    | field       | operator | value        |
    | geo.loc     | is       | 41.12,-71.34 |
    | labels.team | matches  | re*          |
    | process.pid | matches  | 42*          |
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: The rule keeps creating alerts from the documents that the exceptions do not exclude when many documents are excluded

**Priority:** P1

**Automation coverage**: No existing tests found covering this scenario.
```gherkin
Given an ES|QL rule that reads a few hundred documents
And an exception item that excludes most of them
When the rule runs
Then alerts are created for the remaining documents, up to the maximum alerts per run
And no exclusion error is reported
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: An expired exception item is not applied

**Priority:** P1

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/lists/server/services/exception_lists/build_exception_filter.test.ts`: "it should remove all exception items that are expired", "it should filter out expired exceptions") (buildExceptionFilter, removeExpiredExceptions), partial: they cover the filter builder, not the rule result.
```gherkin
Given an ES|QL rule whose query returns every document of the reference index
And an exception item with the entry host.name is web-01 whose expiration date is in the past
When the rule runs
Then an alert is created for the web-01 documents
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: Items of the rule's own list and of a shared list both apply

**Priority:** P1

**Automation coverage**: No existing tests found covering this scenario.
```gherkin
Given an ES|QL rule linked to its default exception list and to a shared exception list
And the default list excludes host.name web-01 and the shared list excludes host.name web-02
When the rule runs
Then no alert is created for the web-01 and web-02 documents
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A rule preview applies the exceptions

**Priority:** P1

**Automation coverage**: 1 API integration test (`x-pack/solutions/security/test/security_solution_api_integration/test_suites/detections_response/detection_engine/rule_execution_logic/esql/trial_license_complete_tier/esql.ts`: "with exceptions › should apply exceptions"), partial: one "is" entry.
```gherkin
Given an ES|QL rule that is not yet saved
And an exception item with the entry host.name is web-01
When the user previews the rule
Then the preview alerts do not include the web-01 documents
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A field mapped with different types in two indices is matched per index by the DSL filter

**Priority:** P2

**Automation coverage**: No existing tests found covering this scenario.
```gherkin
Given an ES|QL rule over two indices where status is a keyword in one and a long in the other
And an exception item with the entry status is 200
When the rule runs
Then no alert is created for the documents with status 200 in either index
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: Exceptions apply on a rule that uses alert suppression

**Priority:** P2

**Automation coverage**: 1 API integration test (`x-pack/solutions/security/test/security_solution_api_integration/test_suites/detections_response/detection_engine/rule_execution_logic/esql/trial_license_complete_tier/esql_suppression.ts`: "with exceptions › should apply exceptions"), partial: one "is" entry on a rule with alert suppression.
```gherkin
Given an ES|QL rule with alert suppression on host.name
And an exception item with the entry host.name is web-01
When the rule runs
Then no alert is created for the web-01 documents
And alerts for other hosts are suppressed as configured
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

</details>

---

<details>
<summary><strong>Exceptions on computed columns</strong>: 25 scenarios (P0: 7, P1: 14, P2: 4)</summary>

#### Scenario: An exception on a STATS output column excludes only the matching alert rows

**Priority:** P0

**Automation coverage**: 4 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "compares a keyword column with a string literal", "keeps the rows that match the comparison for \"is not\"", "escapes quotes, backslashes and line breaks in the literal", "casts the value for a %s column: %s" (parameterized)), partial: the unit tests cover the generated clause. A script run against a live Elasticsearch (not in the repository) excluded the expected rows for 27 operator and type cases.
```gherkin
Given an ES|QL rule with the query FROM reference | STATS failures = COUNT(*) BY host.name | WHERE failures > 1
And an exception item with the entry failures is 3
And the web-01 host has three events and the web-02 host has two events
When the rule runs
Then no alert is created for web-01
And the alert for web-02 shows a failures value of 2
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: An exception on a renamed column excludes only that row and leaves the other rows unchanged

**Priority:** P0

**Automation coverage**: 4 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "compares a keyword column with a string literal", "keeps the rows that match the comparison for \"is not\"", "escapes quotes, backslashes and line breaks in the literal", "casts the value for a %s column: %s" (parameterized)), partial: the unit tests cover the generated clause. A script run against a live Elasticsearch (not in the repository) excluded the expected rows for 27 operator and type cases.
```gherkin
Given an ES|QL rule that groups by host.name and renames it with RENAME host.name AS target_host
And an exception item with the entry target_host is dc-01
When the rule runs
Then no alert is created for dc-01
And the alerts for the other hosts show the same values as without the exception
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: An exception on an EVAL column excludes the rows with that value

**Priority:** P0

**Automation coverage**: 4 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "compares a keyword column with a string literal", "keeps the rows that match the comparison for \"is not\"", "escapes quotes, backslashes and line breaks in the literal", "casts the value for a %s column: %s" (parameterized)), partial: the unit tests cover the generated clause. A script run against a live Elasticsearch (not in the repository) excluded the expected rows for 27 operator and type cases.
```gherkin
Given an ES|QL rule that adds a tier column with EVAL
And an exception item with the entry tier is gold
When the rule runs
Then no alert is created for the rows whose tier is gold
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: "is not" on a computed column excludes the rows with another value and the rows without a value

**Priority:** P0

**Automation coverage**: 4 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "compares a keyword column with a string literal", "keeps the rows that match the comparison for \"is not\"", "escapes quotes, backslashes and line breaks in the literal", "casts the value for a %s column: %s" (parameterized)), partial: the unit tests cover the generated clause. A script run against a live Elasticsearch (not in the repository) excluded the expected rows for 27 operator and type cases.
```gherkin
Given an ES|QL rule that adds a tier column with EVAL
And an exception item with the entry tier is not gold
And rows exist with tier gold, with tier silver and with no tier
When the rule runs
Then an alert is created only for the rows whose tier is gold
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: "is one of" on a computed column excludes the rows that hold any of the values

**Priority:** P0

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "joins one comparison per value", "keeps the rows that match any value for \"is not one of\"", "does not add parentheses for a single value"), partial: the unit tests cover the generated clause.
```gherkin
Given an ES|QL rule that adds a tier column with EVAL
And an exception item with the entry tier is one of gold, silver
When the rule runs
Then no alert is created for the rows whose tier is gold or silver
And an alert is created for the other rows
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: "is" on a text column that aliases a source field excludes the rows by phrase, as the DSL does

**Priority:** P0

**Automation coverage**: 4 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "compares a text column by phrase, as the DSL match_phrase does", "escapes the phrase of a text column", "joins one phrase per value on a text column", "marks an item as full text when one of its entries compares a text column"), partial: the unit tests cover the generated clause. A script against a live Elasticsearch (not in the repository) excluded the same documents as the DSL match_phrase on the source field for six operator cases.
```gherkin
Scenario Outline: "is" on an aliased text column
  Given an ES|QL rule whose query makes message available as msg with <query_shape>
  And an exception item with the entry msg is "to good.com"
  And documents exist with "Connection to Good.com failed", "good.com", "other host", and no message
  When the rule runs
  Then no alert is created for the document that holds the phrase "to good.com"
  And an alert is created for the other documents

  Examples:
    | query_shape                                |
    | RENAME message AS msg                      |
    | EVAL msg = message                         |
    | RENAME message AS msg \| SORT process.pid  |
    | EVAL msg = message \| WHERE process.pid > 0 |
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A shared list with source-field items and computed-column items applies each item in the right place

**Priority:** P0

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/split_exception_items.test.ts`: "moves an item on a computed column to the end of the query", "moves an item that mixes a source field and a computed column when the query outputs both", "places every item of a mixed list"), partial: the unit tests cover the split decision, not the alerts. 2 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/esql.test.ts`: "exceptions at the end of the query › appends the exceptions on computed columns to the query, before the limit", "exceptions at the end of the query › builds the DSL filter only from the exceptions that stay in the DSL"), partial: the unit tests mock Elasticsearch.
```gherkin
Given an ES|QL rule that groups by host.name, renames it to target_host and counts distinct users
And a shared list with the items user.name is vuln-scanner, target_host is dc-01 and winlog.event_id is 4624
When the rule runs
Then the vuln-scanner events are excluded before the count
And no alert is created for dc-01
And the third item is not applied and is not reported as a warning
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: "is not one of" on a computed column excludes the rows that hold none of the values

**Priority:** P1

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "joins one comparison per value", "keeps the rows that match any value for \"is not one of\"", "does not add parentheses for a single value"), partial: the unit tests cover the generated clause.
```gherkin
Given an ES|QL rule that adds a tier column with EVAL
And an exception item with the entry tier is not one of gold, silver
When the rule runs
Then alerts are created only for the rows whose tier is gold or silver
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: "matches" on a keyword computed column excludes the rows whose whole value fits the pattern

**Priority:** P1

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "uses MV_LIKE on a keyword column", "keeps the rows that match for \"does not match\"", "keeps the escaping of %s that the DSL applies" (parameterized)), partial: the unit tests cover the generated clause.
```gherkin
Given an ES|QL rule that adds a tier column of type keyword with EVAL
And an exception item with the entry tier matches go*
When the rule runs
Then no alert is created for the rows whose tier starts with go
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: "does not match" on a keyword computed column excludes the rows whose value does not fit the pattern

**Priority:** P1

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "uses MV_LIKE on a keyword column", "keeps the rows that match for \"does not match\"", "keeps the escaping of %s that the DSL applies" (parameterized)), partial: the unit tests cover the generated clause.
```gherkin
Given an ES|QL rule that adds a tier column of type keyword with EVAL
And an exception item with the entry tier does not match go*
When the rule runs
Then alerts are created only for the rows whose tier starts with go
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: "exists" on a computed column excludes the rows that have a value

**Priority:** P1

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "excludes the rows where the column is not null", "keeps the rows where the column is not null for \"does not exist\"", "is supported on a text column"), partial: the unit tests cover the generated clause.
```gherkin
Given an ES|QL rule that adds a bonus column that is empty for some rows
And an exception item with the entry bonus exists
When the rule runs
Then an alert is created only for the rows whose bonus is empty
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: "does not exist" on a computed column excludes the rows that are empty

**Priority:** P1

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "excludes the rows where the column is not null", "keeps the rows where the column is not null for \"does not exist\"", "is supported on a text column"), partial: the unit tests cover the generated clause.
```gherkin
Given an ES|QL rule that adds a bonus column that is empty for some rows
And an exception item with the entry bonus does not exist
When the rule runs
Then an alert is created only for the rows that have a bonus
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: "is" works on each supported computed column type

**Priority:** P1

**Automation coverage**: 4 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "compares a keyword column with a string literal", "keeps the rows that match the comparison for \"is not\"", "escapes quotes, backslashes and line breaks in the literal", "casts the value for a %s column: %s" (parameterized)), partial: the unit tests cover the generated clause. A script run against a live Elasticsearch (not in the repository) excluded the expected rows for 27 operator and type cases.
```gherkin
Scenario Outline: "is" on a computed column
  Given an ES|QL rule whose query adds a column of type <type> with EVAL
  And an exception item with the entry that column is <value>
  When the rule runs
  Then no alert is created for the rows that hold <value>
  And an alert is created for the other rows

  Examples:
    | type          | value                |
    | keyword       | good.com             |
    | integer       | 42                   |
    | long          | 9000000000           |
    | unsigned_long | 18446744073709551615 |
    | double        | 3.14                 |
    | boolean       | true                 |
    | ip            | 10.0.0.1             |
    | version       | 1.2.3                |
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A date value on a computed date column excludes the unit that it names

**Priority:** P1

**Automation coverage**: 4 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "rounds %s to the unit of the value, as the DSL does" (parameterized), "uses the last nanosecond as the upper bound of a date_nanos column", "compares an exact instant when the value has a fraction", "keeps the rows in the rounded range for \"is not\""), partial: the unit tests cover the generated clause.
```gherkin
Scenario Outline: "is" on a computed date column
  Given an ES|QL rule whose query adds a date column with EVAL
  And an exception item with the entry that column is <value>
  When the rule runs
  Then no alert is created for the rows dated within <covered>

  Examples:
    | value                    | covered                     |
    | 2026-09-30               | the whole day 2026-09-30    |
    | 2026-09-30T14            | the hour 14:00 to 14:59 UTC |
    | 2026-09                  | the day 2026-09-01 only     |
    | 2026-09-30T14:00:00.123Z | that instant only           |
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: "is one of", "is not" and "is not one of" on an aliased text column follow the DSL for multi-valued, missing and mixed-case values

**Priority:** P1

**Automation coverage**: 4 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "compares a text column by phrase, as the DSL match_phrase does", "escapes the phrase of a text column", "joins one phrase per value on a text column", "marks an item as full text when one of its entries compares a text column"), partial: the unit tests cover the generated clause. A script against a live Elasticsearch (not in the repository) excluded the same documents as the DSL match_phrase on the source field for six operator cases.
```gherkin
Scenario Outline: Operators on an aliased text column
  Given an ES|QL rule that renames the text field message as msg
  And an exception item with the entry msg <operator> <value>
  And documents exist with "Connection to Good.com failed", "bad.com", the values "x" and "to good.com now" in one document, and no message
  When the rule runs
  Then the excluded documents are the ones that the same entry on message excludes in a rule without the rename

  Examples:
    | operator        | value        |
    | is              | Good.com     |
    | is one of       | bad.com, x   |
    | is not          | to good.com  |
    | is not one of   | bad.com, x   |
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: An item with several entries on computed columns combines them with AND, including a negative entry

**Priority:** P1

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "combines the entries with AND", "negates only the excluded entries when an item has several", "quotes column names that are not plain identifiers"), partial: the unit tests cover the generated clause.
```gherkin
Given an ES|QL rule that adds a tier column and a bonus column with EVAL
And one exception item with the entries tier is not gold and bonus exists
When the rule runs
Then no alert is created for the rows that do not have tier gold and that have a bonus
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: An item that names a source field and a computed column is evaluated at the end of the query

**Priority:** P1

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/split_exception_items.test.ts`: "moves an item on a computed column to the end of the query", "moves an item that mixes a source field and a computed column when the query outputs both", "places every item of a mixed list"), partial: the unit tests cover the split decision, not the alerts.
```gherkin
Given an ES|QL rule that outputs host.name and a computed tier column
And one exception item with the entries host.name is web-01 and tier is gold
When the rule runs
Then no alert is created for the rows with host.name web-01 and tier gold
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: An item on a source field that the query overrides still compares the original value

**Priority:** P1

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/split_exception_items.test.ts`: "keeps an item on source fields in the DSL", "keeps items on a flattened key and on a nested field in the DSL", "keeps an item on a source field in the DSL even when the query outputs a column with that name"), partial: the unit tests cover the split decision, not the alerts.
```gherkin
Given an ES|QL rule with EVAL host.name = TO_UPPER(host.name)
And an exception item with the entry host.name is web-01
When the rule runs
Then no alert is created for the documents whose original host.name is web-01
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: The exception stage works when the query ends with SORT and LIMIT

**Priority:** P1

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/esql.test.ts`: "exceptions at the end of the query › appends the exceptions on computed columns to the query, before the limit", "exceptions at the end of the query › builds the DSL filter only from the exceptions that stay in the DSL"), partial: the unit tests mock Elasticsearch.
```gherkin
Given an ES|QL rule whose query ends with SORT failures DESC and LIMIT 5
And an exception item on a computed column
When the rule runs
Then the excluded rows are not in the alerts
And the alerts follow the sort order of the query
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A rule with more rows than the maximum alerts still creates the allowed number of alerts after the exceptions

**Priority:** P1

**Automation coverage**: No existing tests found covering this scenario.
```gherkin
Given an ES|QL rule whose query returns more rows than the maximum alerts per run
And an exception item on a computed column that excludes some of those rows
When the rule runs
Then the number of alerts equals the maximum alerts per run
And none of the alerts is an excluded row
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A row with no value in the computed column is kept by "is"

**Priority:** P1

**Automation coverage**: 4 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "compares a keyword column with a string literal", "keeps the rows that match the comparison for \"is not\"", "escapes quotes, backslashes and line breaks in the literal", "casts the value for a %s column: %s" (parameterized)), partial: the unit tests cover the generated clause. A script run against a live Elasticsearch (not in the repository) excluded the expected rows for 27 operator and type cases.
```gherkin
Given an ES|QL rule that adds a tier column that is empty for some rows
And an exception item with the entry tier is gold
When the rule runs
Then an alert is created for the rows whose tier is empty
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A date value on a computed date_nanos column excludes the unit that it names

**Priority:** P2

**Automation coverage**: 4 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "rounds %s to the unit of the value, as the DSL does" (parameterized), "uses the last nanosecond as the upper bound of a date_nanos column", "compares an exact instant when the value has a fraction", "keeps the rows in the rounded range for \"is not\""), partial: the unit tests cover the generated clause.
```gherkin
Given an ES|QL rule whose query adds a date_nanos column with EVAL
And an exception item with the entry that column is 2026-09-30
When the rule runs
Then no alert is created for the rows dated on 2026-09-30, up to the last nanosecond of the day
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A multi-valued computed column is excluded when any value matches

**Priority:** P2

**Automation coverage**: No existing tests found covering this scenario.
```gherkin
Given an ES|QL rule that adds a multi-valued column with EVAL and MV_APPEND
And an exception item with the entry that column is blue
When the rule runs
Then no alert is created for the rows whose column holds blue among its values
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A column name with a hyphen or a dot can be used in an exception

**Priority:** P2

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "combines the entries with AND", "negates only the excluded entries when an item has several", "quotes column names that are not plain identifiers"), partial: the unit tests cover the generated clause.
```gherkin
Given an ES|QL rule that adds a column named risk-score
And an exception item with the entry risk-score is 75
When the rule runs
Then no alert is created for the rows whose risk-score is 75
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: An aggregating rule with alert suppression applies the exception to the aggregated rows

**Priority:** P2

**Automation coverage**: No existing tests found covering this scenario.
```gherkin
Given an ES|QL rule with a STATS query and alert suppression on host.name
And an exception item on a STATS output column
When the rule runs twice
Then the excluded rows create no alert in either run
And the remaining rows are suppressed as configured
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

</details>

---

<details>
<summary><strong>Items that are not applied and how they are reported</strong>: 13 scenarios (P0: 3, P1: 6, P2: 4)</summary>

#### Scenario: "matches" and "does not match" on a text computed column are not applied and are reported

**Priority:** P0

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "does not compile \"matches\" on a text column, which the DSL compares by token", "is supported on a text column"), partial: the unit tests cover the compiler, not the warning shown on the rule.
```gherkin
Scenario Outline: Wildcard exception on a text computed column
  Given an ES|QL rule with RENAME message AS msg, which keeps the type text
  And an exception item with the entry msg <operator> good*
  When the rule runs
  Then the rule shows a warning that the item was not applied
  And alerts are created for every document

  Examples:
    | operator       |
    | matches        |
    | does not match |
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A value that does not fit the column type is not applied and does not exclude every row

**Priority:** P0

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "casts the value for a %s column: %s" (parameterized), "does not compile a value that does not cast to a %s column: %s" (parameterized)), partial: the unit tests cover the compiler, not the warning shown on the rule.
```gherkin
Scenario Outline: Value that does not cast
  Given an ES|QL rule whose query adds a column of type <type> with EVAL
  And an exception item with the entry that column is <value>
  When the rule runs
  Then the rule shows a warning that the value is not valid for the column
  And alerts are still created for every row

  Examples:
    | type    | value                         |
    | integer | abc                           |
    | integer | 2147483648                    |
    | ip      | 10.0.0.0/24                   |
    | boolean | maybe                         |
    | date    | 2026-09-30T16:00:00+02:00     |
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: An item whose fields are in neither the source nor the output is not applied and creates no warning

**Priority:** P0

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/split_exception_items.test.ts` and `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "skips, at debug level, an item whose field is nowhere", "only logs, at debug level, an item whose field is not part of the rule"), partial: the unit tests do not check the alerts.
```gherkin
Given the feature flag is on
And an ES|QL rule whose query returns every document of the reference index
And an exception item with the entry missing.field is not x
When the rule runs
Then alerts are created for every document
And no warning is shown on the rule
And the rule log records the skipped item at debug level
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A text comparison in a query that uses LIMIT or STATS is not applied and is reported

**Priority:** P1

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "applies a text comparison without another request when the query only uses commands that accept it", "does not apply a text comparison when the query uses a command that can make it fail, and keeps the other items", "does not apply a text comparison after STATS, where the position cannot be decided from the query"), partial: the unit tests use a mocked Elasticsearch client. 4 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/find_full_text_blocker.test.ts`: "accepts a query that only uses commands that allow a full-text function: %s" (parameterized), "returns the command that blocks the function: %s" (parameterized), "looks inside sub-queries and FORK branches", "treats a query that cannot be parsed as blocked"), partial: the unit tests check the query text, not the rule.
```gherkin
Scenario Outline: Command that can make Elasticsearch reject the function
  Given an ES|QL rule with RENAME message AS msg followed by <stage>
  And an exception item with the entry msg is "good.com"
  When the rule runs
  Then the rule shows a warning that names the command
  And alerts are created for every row
  And the rule does not fail

  Examples:
    | stage                                    |
    | LIMIT 100                                |
    | SORT process.pid and LIMIT 3             |
    | STATS n = COUNT(*) BY msg                |
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: When a text comparison is not applied, the other exceptions of the rule still apply

**Priority:** P1

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "applies a text comparison without another request when the query only uses commands that accept it", "does not apply a text comparison when the query uses a command that can make it fail, and keeps the other items", "does not apply a text comparison after STATS, where the position cannot be decided from the query"), partial: the unit tests use a mocked Elasticsearch client. 4 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/find_full_text_blocker.test.ts`: "accepts a query that only uses commands that allow a full-text function: %s" (parameterized), "returns the command that blocks the function: %s" (parameterized), "looks inside sub-queries and FORK branches", "treats a query that cannot be parsed as blocked"), partial: the unit tests check the query text, not the rule.
```gherkin
Given an ES|QL rule whose query ends with LIMIT 100
And one exception item on a text column and one on a keyword computed column
When the rule runs
Then the keyword item excludes its rows
And the rule shows a warning only for the text item
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A column type that cannot be tested is not applied and is reported

**Priority:** P1

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "does not compile a column of type %s" (parameterized), "does not compile \"matches\" on a column that is not a string"), partial: the unit tests cover the compiler, not the warning shown on the rule.
```gherkin
Scenario Outline: Exception on an unsupported column
  Given an ES|QL rule whose output has a column of type <type>
  And an exception item with the entry that column is <value>
  When the rule runs
  Then the rule shows a warning that names the column and its type
  And no alert is excluded by that item

  Examples:
    | type        | value        |
    | geo_point   | 41.12,-71.34 |
    | cartesian_point | 1.0,2.0  |
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: "matches" on a column that is not a string is not applied and is reported

**Priority:** P1

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "does not compile a column of type %s" (parameterized), "does not compile \"matches\" on a column that is not a string"), partial: the unit tests cover the compiler, not the warning shown on the rule.
```gherkin
Given an ES|QL rule whose output has a long column named count
And an exception item with the entry count matches 4*
When the rule runs
Then the rule shows a warning that matches is not supported on a long column
And no alert is excluded by that item
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A value list or nested entry on a computed column is not applied and is reported

**Priority:** P1

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/split_exception_items.test.ts` and `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "skips, with a warning, a value list on a computed column", "does not compile %s entries" (parameterized over list and nested)), partial: the unit tests cover the decision, not the warning shown on the rule.
```gherkin
Given an ES|QL rule whose query adds a tier column with EVAL
And an exception item that uses a value list on the tier column
When the rule runs
Then the rule shows a warning that list entries are not supported at the end of the query
And alerts are still created for every row
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: An item that needs a source field that the query does not output is reported

**Priority:** P1

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/split_exception_items.test.ts` and `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "skips, with a warning, an item that needs a source field the query drops", "warns about an item that cannot be evaluated"), partial: the unit tests do not check the warning text shown on the rule.
```gherkin
Given an ES|QL rule with STATS failures = COUNT(*) BY user.name
And an exception item with the entries host.name is web-01 and failures is 3
When the rule runs
Then the rule shows a warning that host.name is a source field that the query does not output
And no alert is excluded by that item
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: Converting the text column to keyword in the rule makes "matches" apply to the whole value

**Priority:** P2

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "does not compile \"matches\" on a text column, which the DSL compares by token", "is supported on a text column"), partial: the unit tests cover the compiler, not the warning shown on the rule.
```gherkin
Given an ES|QL rule with RENAME message AS msg and EVAL msg = TO_STRING(msg)
And an exception item with the entry msg matches good*
When the rule runs
Then no alert is created for the rows whose whole message starts with good
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: The warning lists the first five skipped items and counts the rest

**Priority:** P2

**Automation coverage**: No existing tests found covering this scenario.
```gherkin
Given an ES|QL rule and seven exception items that cannot be applied at the end of the query
When the rule runs
Then the rule warning names five of the items
And the rule warning ends with the words 'and 2 more'
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: No more than 100 items are applied at the end of the query

**Priority:** P2

**Automation coverage**: 1 unit test (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/split_exception_items.test.ts`: "applies at most MAX_END_STAGE_ITEMS items at the end of the query"), partial: the unit test checks the decision, not the rule warning.
```gherkin
Given an ES|QL rule and 101 exception items on computed columns
When the rule runs
Then 100 items are applied
And the rule shows a warning for the 101st item
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: An "is one of" list is applied up to 250 values and reported above that

**Priority:** P2

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "does not compile a list that is too long for one expression", "compiles the longest allowed list"), partial: the unit tests cover the compiler, not the rule warning.
```gherkin
Scenario Outline: "is one of" list size on a computed column
  Given an ES|QL rule whose query adds a keyword column with EVAL
  And an exception item with that column is one of <count> values
  When the rule runs
  Then <result>

  Examples:
    | count | result                                               |
    | 250   | the rows holding any of the values create no alert   |
    | 251   | the rule shows a warning and the item is not applied |
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

</details>

---

<details>
<summary><strong>Feature flag and failure handling</strong>: 3 scenarios (P0: 2, P1: 0, P2: 1)</summary>

#### Scenario: With the feature off, an exception on a computed column is not applied and no field lookup happens

**Priority:** P0

**Automation coverage**: 1 unit test (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/esql.test.ts`: "exceptions at the end of the query › does not look at the exceptions when the feature is off"), partial: the unit test checks that no field lookup happens, not the alerts.
```gherkin
Given the feature flag is off
And an ES|QL rule with an exception item on a computed column
When the rule runs
Then alerts are created for every row
And the rule logs show no field lookup request
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: If the fields cannot be inspected, every exception stays in the DSL filter and the rule reports it

**Priority:** P0

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts` and `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/esql.test.ts`: "keeps every item in the DSL filter when the schemas cannot be read", "keeps every item in the DSL filter when the output probe fails", "exceptions at the end of the query › keeps the DSL filter of the wrapper when an exception cannot be inspected"), partial: the unit tests use mocked Elasticsearch clients.
```gherkin
Given the feature flag is on
And the field lookup request fails during the rule run
And an ES|QL rule with an exception item on a source field
When the rule runs
Then the source-field exception still excludes its documents
And the rule shows a warning that the fields could not be inspected
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A rule created before the feature was enabled uses it on its next run

**Priority:** P2

**Automation coverage**: No existing tests found covering this scenario.
```gherkin
Given an ES|QL rule created and run with the feature off
And the feature is then enabled and Kibana restarted
When the rule runs again
Then the exceptions on computed columns apply without editing the rule
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

</details>

---

<details>
<summary><strong>Dependency data lifecycle</strong>: 4 scenarios (P0: 0, P1: 2, P2: 2)</summary>

#### Scenario: A deleted exception item stops excluding on the next run, in both positions

**Priority:** P1

**Automation coverage**: No existing tests found covering this scenario.
```gherkin
Given an ES|QL rule with one exception item on a source field and one on a computed column
And both items excluded rows in the previous run
When the user deletes both items and the rule runs again
Then the previously excluded rows create alerts
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: An edited exception value applies on the next run

**Priority:** P1

**Automation coverage**: No existing tests found covering this scenario.
```gherkin
Given an ES|QL rule with an exception item on a computed column
And the item excluded the rows with value gold in the previous run
When the user changes the value to silver and the rule runs again
Then the rows with gold create alerts
And the rows with silver create no alert
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A field that is mapped later moves its item from skipped to the source filter

**Priority:** P2

**Automation coverage**: No existing tests found covering this scenario.
```gherkin
Given an ES|QL rule with an exception item on a field that is not in the source indices
And the item was skipped in the previous run
When the field is mapped in the source index, receives data, and the rule runs again
Then the item excludes the documents that hold the value
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: Editing the rule query to rename a column changes where its exception applies

**Priority:** P2

**Automation coverage**: No existing tests found covering this scenario.
```gherkin
Given an ES|QL rule with an exception item on the column target_host
When the user edits the query so that the column is named dest_host and the rule runs
Then the item is skipped without a warning
And no alert is excluded by that item
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

</details>

---

<details>
<summary><strong>Spaces and cross-cluster search (to confirm)</strong>: 2 scenarios (P0: 0, P1: 0, P2: 2)</summary>

#### Scenario: Exceptions on a computed column apply for a rule in a non-default space

**Priority:** P2

**Automation coverage**: No existing tests found covering this scenario.
```gherkin
Given an ES|QL rule in a space other than the default space
And an exception item on a computed column linked to that rule
When the rule runs
Then the excluded rows create no alert
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: Exceptions apply for a rule that reads a remote cluster

**Priority:** P2

**Automation coverage**: No existing tests found covering this scenario.
```gherkin
Given an ES|QL rule with FROM remote_cluster:logs-* and exception items on a source field and on a computed column
When the rule runs
Then both items exclude their rows
And the field inspection does not fail because of the remote index
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

</details>

---

## Test Coverage Summary

**Total scenarios:** 72

| Feature area | Scenarios | P0 | P1 | P2 | Automated | Manual only |
|---|---|---|---|---|---|---|
| Exceptions on source fields keep working | 25 | 10 | 13 | 2 | 17 | 8 |
| Exceptions on computed columns | 25 | 7 | 14 | 4 | 22 | 3 |
| Items that are not applied and how they are reported | 13 | 3 | 6 | 4 | 12 | 1 |
| Feature flag and failure handling | 3 | 2 | 0 | 1 | 2 | 1 |
| Dependency data lifecycle | 4 | 0 | 2 | 2 | 0 | 4 |
| Spaces and cross-cluster search (to confirm) | 2 | 0 | 0 | 2 | 0 | 2 |
| **Total** | **72** | **22** | **35** | **15** | **53** | **19** |

**Automated coverage notes:**
- The Automated column counts scenarios with at least one matching unit or API integration test. Almost all of them are partial: the tests check the generated clause, the compiler or the split decision with mocked clients, not the alerts of a running rule. Only the "is" operator on one field has an API integration test.
- Unit tests (Jest) for the DSL filter builder in `x-pack/solutions/security/plugins/lists/server/services/exception_lists/build_exception_filter.test.ts`: they cover the DSL clause per entry type, not the result of an ES|QL rule.
- Unit tests (Jest) for the new code in `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/` (`build_end_stage_clause.test.ts`, `split_exception_items.test.ts`, `apply_end_stage_exceptions.test.ts`, `find_full_text_blocker.test.ts`) and in `esql.test.ts` ("exceptions at the end of the query"): they cover the compiler, the split decision, the orchestration and the wiring with mocked Elasticsearch clients.
- API integration tests in `x-pack/solutions/security/test/security_solution_api_integration/test_suites/detections_response/detection_engine/rule_execution_logic/esql/trial_license_complete_tier/`: `esql.ts` and `esql_suppression.ts` each have one "with exceptions › should apply exceptions" test with an "is" entry on `client.ip`.
- Two scripts against a live Elasticsearch (not in the repository): one excluded the expected rows for 27 operator and type cases; one compared `is`, `is one of`, `is not` and `is not one of` on an aliased `text` column with the DSL `match_phrase` on the source field and checked eight query shapes, including that nothing besides the output probe is requested.
- Not covered: no Scout, Cypress or API integration test exercises exceptions on computed columns, the warnings of skipped items, the feature flag, or the regression matrix of operators and field types for ES|QL rules. Every scenario marked "No existing tests found" needs manual execution or a new automated test.

## Test Execution Notes

Run the scenarios of "Exceptions on source fields keep working" twice: with the feature flag off (baseline) and with it on. The results must be identical.

**P0: run first, block release if failing:**
- "is" excludes the documents that hold the value, for each supported field type
- "is not" excludes the documents that do not hold the value, including those without the field
- "is one of" excludes the documents that hold any of the values
- "matches" excludes the documents whose value fits the pattern on keyword and text fields
- "exists" excludes the documents that have the field
- The entries of one item are combined with AND
- The items of a list are combined with OR
- A value list excludes the documents whose value is in the list
- An exception on a source field changes the aggregates of an aggregating rule
- Alerts are identical with the feature on and off when every exception is on a source field
- An exception on a STATS output column excludes only the matching alert rows
- An exception on a renamed column excludes only that row and leaves the other rows unchanged
- An exception on an EVAL column excludes the rows with that value
- "is not" on a computed column excludes the rows with another value and the rows without a value
- "is one of" on a computed column excludes the rows that hold any of the values
- "is" on a text column that aliases a source field excludes the rows by phrase, as the DSL does
- A shared list with source-field items and computed-column items applies each item in the right place
- "matches" and "does not match" on a text computed column are not applied and are reported
- A value that does not fit the column type is not applied and does not exclude every row
- An item whose fields are in neither the source nor the output is not applied and creates no warning
- With the feature off, an exception on a computed column is not applied and no field lookup happens
- If the fields cannot be inspected, every exception stays in the DSL filter and the rule reports it

**P1: run before release, high-impact regressions:**
- "is not one of" excludes the documents that hold none of the values
- "does not match" excludes the documents whose value does not fit the pattern
- "does not exist" excludes the documents that lack the field
- A multi-valued field is excluded when any one of its values matches
- A date value excludes the unit that it names, and only the first day for a month or year value
- A nested entry excludes a document only when one nested object satisfies every inner entry
- A value list that cannot be processed is reported on the rule and the other exceptions still apply
- With the feature off, "is not" on a field that is not in the source indices excludes every document
- A field type that Elasticsearch rejects fails the rule and creates no alert
- The rule keeps creating alerts from the documents that the exceptions do not exclude when many documents are excluded
- An expired exception item is not applied
- Items of the rule's own list and of a shared list both apply
- A rule preview applies the exceptions
- "is not one of" on a computed column excludes the rows that hold none of the values
- "matches" on a keyword computed column excludes the rows whose whole value fits the pattern
- "does not match" on a keyword computed column excludes the rows whose value does not fit the pattern
- "exists" on a computed column excludes the rows that have a value
- "does not exist" on a computed column excludes the rows that are empty
- "is" works on each supported computed column type
- A date value on a computed date column excludes the unit that it names
- "is one of", "is not" and "is not one of" on an aliased text column follow the DSL for multi-valued, missing and mixed-case values
- An item with several entries on computed columns combines them with AND, including a negative entry
- An item that names a source field and a computed column is evaluated at the end of the query
- An item on a source field that the query overrides still compares the original value
- The exception stage works when the query ends with SORT and LIMIT
- A rule with more rows than the maximum alerts still creates the allowed number of alerts after the exceptions
- A row with no value in the computed column is kept by "is"
- A text comparison in a query that uses LIMIT or STATS is not applied and is reported
- When a text comparison is not applied, the other exceptions of the rule still apply
- A column type that cannot be tested is not applied and is reported
- "matches" on a column that is not a string is not applied and is reported
- A value list or nested entry on a computed column is not applied and is reported
- An item that needs a source field that the query does not output is reported
- A deleted exception item stops excluding on the next run, in both positions
- An edited exception value applies on the next run

**P2: run as capacity allows, limited blast radius:**
- A field mapped with different types in two indices is matched per index by the DSL filter
- Exceptions apply on a rule that uses alert suppression
- A date value on a computed date_nanos column excludes the unit that it names
- A multi-valued computed column is excluded when any value matches
- A column name with a hyphen or a dot can be used in an exception
- An aggregating rule with alert suppression applies the exception to the aggregated rows
- Converting the text column to keyword in the rule makes "matches" apply to the whole value
- The warning lists the first five skipped items and counts the rest
- No more than 100 items are applied at the end of the query
- An "is one of" list is applied up to 250 values and reported above that
- A rule created before the feature was enabled uses it on its next run
- A field that is mapped later moves its item from skipped to the source filter
- Editing the rule query to rename a column changes where its exception applies
- Exceptions on a computed column apply for a rule in a non-default space
- Exceptions apply for a rule that reads a remote cluster

---

<details>
<summary>📊 Issue Clarity Assessment</summary>

Not applicable: no GitHub issue was used. The plan was derived from `esql_exceptions_proposal.md`, `esql_exceptions_v1_inventory.md` and the implementation on the branch `esql-end-stage-exceptions`. Create an issue for the work and regenerate the plan with the `test-plan-generator` skill if a scored assessment is needed. ⚠️

</details>

---

*🤖 Generated by claude-sonnet-5-5 on 2026-10-02*
