# Test Plan: Exceptions for ES|QL rules, existing behavior and exceptions on computed columns

## Overview

This test plan has two goals for the ES|QL rule type (`siem.esqlRule`). First, confirm that every exception that works today keeps working: exceptions on source fields, applied as a DSL filter on the `_query` request. Second, validate the new capability behind the advanced setting `securitySolution:enableEsqlRuleComputedFieldExceptions`: exceptions on computed (transient) columns of the ES|QL query, applied as one `WHERE` stage at the end of the query, together with the rules for items that cannot be applied.

## Feature Background

An ES|QL rule applies exceptions as a DSL filter that Elasticsearch runs on the source documents before the rule's ES|QL pipeline. An exception cannot reference a column that the pipeline computes with `STATS`, `EVAL` or `RENAME`, because the column does not exist when the filter runs. The proposal keeps the DSL filter for source fields, and for fields that exist nowhere, and adds one `WHERE` stage at the end of the query for items whose fields are all computed output columns of a supported type. An item with a computed column that the end of the query cannot evaluate is not applied and is recorded in the rule execution log, never as a rule warning. A value that the stage cannot write for the type of its column fails the rule. The design and the supported types are in `esql_exceptions_proposal.md`.

## Scope

**In scope:**
- Regression of every exception entry type and operator on source fields for the ES|QL rule type: "is", "is not", "is one of", "is not one of", "matches", "does not match", "exists", "does not exist", "is in list", "is not in list", and nested entries.
- Regression of rule-level behavior: multi-valued fields, date rounding, AND of entries and OR of items, aggregating rules, expired items, default and shared lists, rule preview, alert suppression.
- Exceptions on computed columns for the 11 supported column types and the four entry types (`match`, `match_any`, `wildcard`, `exists`) and their negative operators, including `text` columns that alias a source field, which are compared as `keyword` columns, on the whole value and respecting case.
- Items that are not applied (unsupported types, list and nested entries, an item with a computed column and an entry on a field that exists nowhere, source fields the query drops) and how they are logged and reported.
- The limits of the end of the query (200 comparisons in one `WHERE` stage, 1,000,000 characters) and the failure that names them, the single `MV_INTERSECTS` call of an "is one of" list, the advanced setting, and the failure path when the fields cannot be inspected.
- Dependency data lifecycle: exception items deleted or edited between runs, mappings that change, rule queries that are edited.

**Out of scope:**
- Value lists as lookup indices with `LOOKUP JOIN`: a later iteration; value lists keep running through the DSL filter.
- In-memory filtering of large value lists: the ES|QL executor does not do it today and it is not part of this delivery.
- Applying source-field exceptions as a `WHERE` stage right after `FROM`: rejected in the proposal as too risky; the DSL filter stays.
- A `text` source field and a `text` computed column can exclude different documents for the same exception: the DSL filter compares the analyzed text of a source field, and a computed column is compared on the whole value as the exceptions documentation describes. This is documented in the proposal and covered by a manual scenario.
- Upgrade and migration scenarios: the change ships no mapping, saved-object or navigation change. It adds one advanced setting (`securitySolution:enableEsqlRuleComputedFieldExceptions`, off by default), whose value is stored in the advanced settings of each space; confirm before publishing.
- CRUD of exception lists and items, and of rules: no new persisted object; existing objects are only read by the executor.
- Performance: outside the scope of the functional test plan.

## Terminology

| Term | Definition |
|---|---|
| Source field | A field that `_field_caps` lists with a type that holds values for the indices in the rule's `FROM`, including `nested` paths and keys below a `flattened` field. An `object` is not a source field. |
| Computed column (transient column) | A column that exists only in the output of the ES|QL query, created or renamed by `EVAL`, `STATS` or `RENAME`. |
| DSL filter | The Query DSL filter built from the exception items and sent with the `_query` request; it runs on the source documents before the query. |
| End of the query | The one `| WHERE` stage that the executor appends after the rule query for items on computed columns. |
| Item and entry | An exception item holds one or more entries joined with AND; the items of a list are joined with OR. |

## Assumptions

- **License level:** ⚠️ Not confirmed. Use a license that allows ES|QL rules (trial or Enterprise for these runs).
- **User role:** A user who can create and edit rules and exception lists. No role matrix is tested (see Known Limitations).
- **Data setup:** A reference index with documents that have these fields: `host.name` (keyword), `user.name` (keyword), `message` (text), `process.pid` (long), `source.ip` (ip), `event.allowed` (boolean), `event.start` (date), `agent.version` (version), `labels` (flattened), `tags` (keyword, several values per document), `geo.loc` (geo_point) and `groups` (nested, with `name` and `role`). Documents are chosen per scenario so that one matches, one does not match and one lacks the field.
- **Rule execution log:** The messages of the scenarios that check the log are written only with extended rule execution logging: the experimental feature `extendedRuleExecutionLoggingEnabled` and a minimum level of Info or lower in the advanced setting "Extended rule execution logging: min level". They are read from `.kibana-event-log-*` (provider `securitySolution.ruleExecution`, action `message`).
- **Advanced setting:** `securitySolution:enableEsqlRuleComputedFieldExceptions` (Advanced settings, Security Solution, "Enable exceptions on computed fields in ES|QL rules"), off by default and scoped to the space. It applies from the next rule run, with no restart. All scenarios of "Exceptions on source fields keep working" run twice, once with the setting disabled and once with it enabled; the expected result is the same in both runs. The other areas run with the setting enabled unless a scenario says otherwise.
- **Deployment type:** Self-managed (stateful). Serverless and ECH are not verified.
- **Elasticsearch version:** ⚠️ The design was checked on an Elasticsearch 9.6 snapshot. The minimum version that supports `MV_CONTAINS`, `MV_INTERSECTS`, `MV_LIKE` and `MV_IN_RANGE` is not confirmed; run the plan on every supported version before release.
- **Target version:** ⚠️ Not specified: please confirm before publishing (upgrade is recorded under Out of scope).

## Acceptance Criteria

No GitHub issue exists for this work. The criteria below are inferred from `esql_exceptions_proposal.md` and the implementation on the branch `esql-end-stage-exceptions`.

1. Every exception on a source field behaves as it does today: the DSL filter is built from the same items and excludes the same documents, with the setting enabled or disabled.
2. With the setting disabled, the executor makes no field lookup request and builds the same request as today.
3. With the setting enabled, an item whose fields are all source fields (or keys below a `flattened` field), or exist nowhere (they are neither source fields nor columns of the output), stays in the DSL filter. A negative operator such as "is not" on a field that exists nowhere keeps matching every document, as it does today. In an item that also has a computed column, such an entry is true for every row and is left out of the stage, and an entry that is not negative makes the item not applied.
4. With the setting enabled, an item whose fields are all output columns of a supported type, and not source fields, is appended at the end of the query as a `| WHERE` stage placed before the final limit.
5. The supported column types are `keyword`, `integer`, `long`, `unsigned_long`, `boolean`, `ip`, `version`, `date` and `date_nanos` for "is", "is one of" and "exists" (and their negatives), `double` for "exists" only (a `float` is widened to `double`, so an equality can miss the value), and `keyword` and `text` for "matches" (and its negative). A `text` column is compared as a `keyword` column, on the whole value and respecting case, as the exceptions documentation describes. No full-text function is used, so the commands of the rule query do not matter.
6. Values are cast to the column type, and a value that does not cast never excludes every row. A value that the stage cannot write fails the rule before the query runs, as a user error, with a message that names the item, its list, the value and the field. That covers a value that is not valid for the type (`bogus` for an `ip` column, `maybe` for a `boolean`) and a value that is valid but that the compiler does not write (`1e3` on a `long` column, a date in an unsupported format).
7. An item that cannot be applied is removed from the DSL filter. It never adds a warning to the rule. The rule execution log has one JSON message for the run (type `esql_exceptions`) with the final query, the items applied at the end of the query, and for each item that is not applied a stable code, a reason and its fields.
8. The items at the end of the query are written in one `WHERE` stage of at most 200 comparisons, in a query of at most 1,000,000 characters. A limit that the items reach fails the rule as a user error, before the query runs, and the message names the limit and the items with the most comparisons, and tells the user to remove values or items. An "is one of" list is written as one `MV_INTERSECTS` call and has no limit on its number of values besides the length of the query.
9. A `text` column is compared the same after any command of the rule query, `LIMIT`, `STATS` and `MV_EXPAND` included, because the comparison is a plain `MV_CONTAINS`, `MV_INTERSECTS` or `MV_LIKE` and not a full-text function. No request is made for this.
10. If the field lookup or the output probe fails, the rule fails before the query runs, with a message that says the fields of the exceptions could not be inspected and includes the reason, and no alerts are created. It is a user error when the failed request is one. Nothing of this runs with the setting disabled.
11. Expired items are not applied in either position.
12. An item with `os_types` is not applied at the end of the query and keeps its `os_types` in the DSL filter. The executor does not read the rule query: an item whose fields are all source fields, or exist nowhere, stays in the DSL filter and nowhere else, even when the query redefines or outputs a field with that name, so the exception compares the source value as it always did. A column named with a word that ES|QL reserves (`first`, `by`) is quoted, and a comment at the end of the rule query does not swallow the appended stages.

## Known Limitations

- ⚠️ No GitHub issue is linked, so the Issue Clarity Assessment at the end of the plan is not applicable and the acceptance criteria are inferred from the proposal.
- ⚠️ The implementation was verified with unit tests, with a script against a live Elasticsearch (27 operator and type cases) and with an interactive script that creates a rule through Kibana (single and mixed exceptions, `is one of` on several types, invalid values, a missing field, the setting enabled and disabled). The scenarios in this plan are the first complete end-to-end check: they cover the operator and type matrix, several rule queries, spaces and cross-cluster search, which those runs did not.
- An item whose fields exist nowhere stays in the DSL filter, so a negative operator such as "is not" on such a field keeps excluding every document, as it does today. The Elastic documentation does not describe this result: it only warns that an exception on an unmapped field can prevent the exception from working as expected. Scenario "\"is not\" on a field that exists nowhere excludes every document, with the setting disabled or enabled" records it, and the scenarios of an item with a computed column and an entry on a field that exists nowhere record the one case that is not left to the DSL: a negative entry is left out of the stage, and any other entry makes the item not applied.
- ⚠️ Exceptions on computed columns run at the end of the rule query, after any `LIMIT` the rule has, so a rule with `LIMIT n` can return fewer than `n` alerts. This was decided on purpose (see the proposal, "The stage goes after any LIMIT") and the two scenarios about `LIMIT` record the expected result.
- ⚠️ ES|QL rejects a query of more than 1,000,000 characters, which is not documented. The executor fails the rule before the query runs when the final query would pass that length (a few characters are kept for the page size), and the message names the limit.
- ⚠️ The exception items are joined with `AND` in one `WHERE` stage of at most 200 comparisons in total. A rule whose exceptions on computed columns need more fails, and splitting an item into several items does not help, because all the comparisons are counted together.
- ⚠️ The limits of the end of the query are a new restriction that applies only there, and a rule that reaches one fails; the DSL filter has no such limits today.
- ⚠️ The area "Spaces and cross-cluster search (to confirm)" is included because rules are space-aware and the field inspection queries Elasticsearch indices, including remote ones. Confirm that both are in the release scope before executing it.
- ⚠️ The scenario "If the fields cannot be inspected, the rule fails" needs a failing field lookup, which is hard to cause by hand; it is best covered by an automated test with a failing Elasticsearch client.
- ⚠️ A `text` source field stays in the DSL filter, where `is` ignores the case and finds the value inside a longer one, and `matches` compares lowercase tokens. The exceptions documentation says that exceptions are case-sensitive, so the same exception can exclude different documents on a source field and on a computed column. Run the manual scenario about it and agree the wording of the user documentation.
- ⚠️ The minimum Elasticsearch version for the ES|QL functions used at the end of the query is not confirmed (see Assumptions).
- Required testing types: positive, negative, edge-case and error-handling scenarios are present in the first four areas. State-based coverage is in "Dependency data lifecycle". Performance, accessibility, i18n and visual testing are outside the scope of this skill.
- Optional sections not included: RBAC (the proposal does not change privileges) and multi-tenant (serverless is not in scope).
- Float and half-float columns computed from a source field are not covered because equality with typed decimals does not work at the end of the query; the types are listed as unsupported in the proposal.
- The team critical-workflows map for the Security Solution was applied: "Rule execution and alert generation" is P0, so scenarios whose failure would change which alerts a rule creates are P0.

## Test Scenarios

<details>
<summary><strong>Exceptions on source fields keep working</strong>: 25 scenarios (P0: 11, P1: 12, P2: 2)</summary>

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

#### Scenario: Alerts are identical with the setting enabled and disabled when every exception is on a source field

**Priority:** P0

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/split_exception_items.test.ts`: "needsOutputColumns › is false when every field is a source field", "keeps items on a flattened key and on a nested field in the DSL", "a source field that the query also outputs › stays in the DSL filter only, with %s" (parameterized)), partial: the unit tests cover the split decision, not the alerts.
```gherkin
Given an ES|QL rule and a list of exception items that are all on source fields
And the rule ran once with the setting disabled
When the setting is enabled and the rule runs again on the same data
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

#### Scenario: "is not" on a field that exists nowhere excludes every document, with the setting disabled or enabled

**Priority:** P0

**Automation coverage**: 7 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/split_exception_items.test.ts`: "keeps in the DSL an item with \"%s\" on a field that exists nowhere, so that it keeps matching every document" (4 tests: is not, is not one of, does not exist, does not match), "keeps in the DSL an item whose fields exist nowhere, so that the DSL decides as it always did", "keeps in the DSL an item that has only a nested entry on a path that exists nowhere, so that the DSL decides", "keeps in the DSL an item that has a field that exists nowhere and a source field, even one that the query drops"; `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "keeps in the DSL filter an item whose field is not part of the rule, and changes nothing"), partial: the unit tests cover the placement, not the alerts of a running rule.
```gherkin
Scenario Outline: A negative operator on a field that no document has
  Given the advanced setting is <setting>
  And an ES|QL rule whose query returns every document of the reference index
  And an exception item with the entry missing.field is not x
  When the rule runs
  Then no alert is created for any document
  And the rule execution log has no esql_exceptions message for the item

  Examples:
    | setting  |
    | disabled |
    | enabled  |

Scenario: The same negative operator in an item with a source field
  Given the advanced setting is enabled
  And an exception item with the entries missing.field is not x and host.name is web-01
  When the rule runs
  Then no alert is created for the web-01 documents
  And the alerts for the other documents are created

Scenario: A positive operator on a field that no document has
  Given the advanced setting is enabled
  And an exception item with the entry missing.field is x
  When the rule runs
  Then alerts are created for every document

Scenario: A nested entry on a path that is not mapped
  Given the advanced setting is disabled or enabled
  And an exception item with a nested entry on ghost_nested, with the inner entry name is svc
  When the rule runs
  Then the rule fails with the Elasticsearch error "failed to find nested object under path [ghost_nested]", as it does today
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

**Automation coverage**: 5 unit tests (`x-pack/solutions/security/plugins/lists/server/services/exception_lists/build_exception_filter.test.ts`: "it should remove all exception items that are expired", "it should filter out expired exceptions" (buildExceptionFilter, removeExpiredExceptions); `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/esql.test.ts`: "expiry › drops an item that expired before the execution started, although it expires after the end of the time range", "expiry › applies an item that expires after the execution started", "expiry › builds the DSL filter with the start of the execution, as the common wrapper does"), partial: they cover the filter builder and the executor with mocked clients, not the rule result.
```gherkin
Given an ES|QL rule whose query returns every document of the reference index
And an exception item with the entry host.name is web-01 whose expiration date is in the past
When the rule runs
Then an alert is created for the web-01 documents

Scenario: The expiry is decided at the start of the execution, with the setting enabled or disabled
  Given an ES|QL rule with to: now-5m
  And an exception item on a computed column that expired 3 minutes before the execution started
  And a second item on a source field that expires 1 minute after the execution started
  When the rule runs with the advanced setting enabled
  Then the first item is not applied, as it is not with the setting disabled
  And the second item is applied
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
<summary><strong>Exceptions on computed columns</strong>: 43 scenarios (P0: 7, P1: 26, P2: 10)</summary>

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

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "tests the whole list with one call", "keeps the rows that match any value for \"is not one of\"", "uses the same call for a list of one value"), partial: the unit tests cover the generated clause.
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

#### Scenario: "is" on a text computed column excludes the rows by the whole value and respecting case, as on a keyword column

**Priority:** P0

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "compares a text column on the whole value and respecting case, as a keyword column", "escapes the value of a text column"), partial: the unit tests cover the generated clause. Real rules run through Kibana (a script that is not in the repository) excluded the documents in the examples.
```gherkin
Scenario Outline: "is" on a text computed column
  Given an index with a text field message and the documents "Connection to good.com failed", "GOOD morning", "Good.com", "other thing", "GOOD.COM" and "good.com"
  And an ES|QL rule with the query FROM logs-* METADATA _id | EVAL msg = message
  And an exception item with the entry msg is <value>
  When the rule runs
  Then no alert is created for <excluded>
  And alerts are created for the other documents

  Examples:
    | value    | excluded      |
    | good.com | "good.com"    |
    | GOOD.COM | "GOOD.COM"    |
    | Good.com | "Good.com"    |
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

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "tests the whole list with one call", "keeps the rows that match any value for \"is not one of\"", "uses the same call for a list of one value"), partial: the unit tests cover the generated clause.
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

**Automation coverage**: 5 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "rounds %s to the unit of the value, as the DSL does" (parameterized), "uses the last nanosecond as the upper bound of a date_nanos column", "compares an exact instant when the value has a fraction", "compares the instant in UTC when the value has a fraction and an offset", "keeps the rows in the rounded range for \"is not\""), partial: the unit tests cover the generated clause.
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
    | 2026-09-30T16:05:09+02:00 | the second 14:05:09 UTC    |
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: "is one of", "is not" and "is not one of" on a text computed column behave as on a keyword column for multi-valued, missing and mixed-case values

**Priority:** P1

**Automation coverage**: 1 unit test (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "writes the list of a text column as one call, as a keyword column"), partial: the unit test covers the generated clause.
```gherkin
Scenario Outline: Operators on a text computed column
  Given an ES|QL rule that makes the text field message available as msg with EVAL msg = message
  And an exception item with the entry msg <operator> <value>
  And documents exist with "Connection to Good.com failed", "good.com", "bad.com", the values "x" and "to good.com" in one document, and no message
  When the rule runs
  Then the excluded documents are the ones that the same entry excludes on a keyword field with the same values

  Examples:
    | operator        | value        |
    | is one of       | bad.com, x   |
    | is not          | good.com     |
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

#### Scenario: A LIMIT in the rule query applies before an exception on a computed column, so the rule can return fewer alerts than the LIMIT

**Priority:** P1

**Automation coverage**: No existing tests found covering this scenario.
```gherkin
Given an ES|QL rule with the query FROM reference | STATS failures = COUNT(*) BY host | RENAME host AS target_host | SORT failures DESC | LIMIT 5
And an exception item with the entry target_host is the host with the most failures
When the rule runs
Then the rule creates 4 alerts
And no alert is created for the host with the most failures
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: An exception on a source field applies before the LIMIT, so the rule still returns as many alerts as the LIMIT

**Priority:** P1

**Automation coverage**: No existing tests found covering this scenario.
```gherkin
Given an ES|QL rule with the query FROM reference | STATS failures = COUNT(*) BY host | SORT failures DESC | LIMIT 5
And an exception item with the entry host is the host with the most failures
When the rule runs
Then the rule creates 5 alerts
And the alerts are the next five hosts by failures
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

#### Scenario: Many exception items are joined with AND in one WHERE stage

**Priority:** P1

**Automation coverage**: 4 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "puts one item in one WHERE stage without parentheses", "joins the items with AND and parentheses in one WHERE stage", "keeps the order of the items", "accepts the comparisons that the limit allows, in one stage"), partial: the unit tests check the text of the stage, not the rows that remain.
```gherkin
Given an ES|QL rule with 100 exception items on computed columns, each an "is one of" with 100 values
And a document that matches the last item
When the rule runs
Then the rule runs without an error
And no alert is created for that document
And the final query in the rule execution log has one WHERE stage
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A CIDR value on a computed ip column excludes every address in the range, including multi-valued columns

**Priority:** P1

**Automation coverage**: 10 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/ip_range.test.ts` and `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "gives the first and the last address of the IPv4 value %s" (parameterized), "gives the first and the last address of the IPv6 value %s" (parameterized), "does not accept %s" (parameterized), "writes a CIDR value as a range of addresses, so any value of a multi-valued column can match", "ignores the bits of the address after the prefix, as Elasticsearch does", "keeps the rows in the range for \"is not\"", "writes an IPv6 prefix as a range", "mixes addresses and ranges in an \"is one of\" list"), partial: the unit tests cover the generated clause. A script against a live Elasticsearch (not in the repository) compared 19 CIDR cases (IPv4, IPv6, unaligned prefixes, multi-valued and missing values, "is not", "is one of") with the DSL, and the excluded documents were the same in all of them.
```gherkin
Given an ES|QL rule whose query adds an ip column with EVAL
And an exception item with the entry that column is 10.0.0.0/24
And documents exist with 10.0.0.77, with 10.0.1.5, with two addresses of which one is 10.0.0.9, and with no address
When the rule runs
Then no alert is created for the documents with an address in 10.0.0.0/24, including the one with two addresses
And alerts are created for the other documents
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A date value on a computed date_nanos column excludes the unit that it names

**Priority:** P2

**Automation coverage**: 5 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "rounds %s to the unit of the value, as the DSL does" (parameterized), "uses the last nanosecond as the upper bound of a date_nanos column", "compares an exact instant when the value has a fraction", "compares the instant in UTC when the value has a fraction and an offset", "keeps the rows in the rounded range for \"is not\""), partial: the unit tests cover the generated clause.
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

#### Scenario: An exception on a double column applies for "exists" only

**Priority:** P1

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "double columns › does not apply \"%s\", because a float is widened and an equality can miss the value" (parameterized), "double columns › still applies \"exists\"", "double columns › does not apply \"is\" on a double column, whatever the value"), partial: the unit tests cover the compiler, not a float field in a running rule.
```gherkin
Scenario Outline: Operators on a double column
  Given an ES|QL rule whose query groups a float field with STATS ... BY g = f
  And an exception item with g <operator> <value>
  When the rule runs
  Then <result>

  Examples:
    | operator   | value  | result                                                                                   |
    | is         | 0.1    | the item is not applied with the code operator_not_supported_on_type and the row alerts |
    | is not     | 0.1    | the item is not applied and no row is excluded                                           |
    | is one of  | 0.1    | the item is not applied with the code operator_not_supported_on_type                     |
    | exists     |        | the rows with a value are excluded                                                       |
    | is         | many   | the rule fails with a message that names the value                                       |
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A source field that the query redefines or outputs stays in the DSL filter only

**Priority:** P1

**Automation coverage**: 5 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/split_exception_items.test.ts`: "needsOutputColumns" (2 tests), "a source field that the query also outputs" (2 tests: a source field with a column of the same type, of another type or with no column, and an item that also names a computed column); `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "does not run the query when every item is on a source field", "keeps in the DSL filter only an exception on a source field that the query redefines"), partial: the unit tests use mocked clients. Real rules run through Kibana (a script that is not in the repository) gave the results in the examples.
```gherkin
Scenario Outline: Query that outputs a source field
  Given an index with a keyword field name that holds "web01", "DB02" and "app03"
  And an ES|QL rule with the query <query>
  And an exception item with name is <value>
  When the rule runs
  Then no alert is created for <excluded>
  And no request other than the query is sent for the exceptions

  Examples:
    | query                                                | value   | excluded                                          |
    | FROM logs METADATA _id \| EVAL name = TO_UPPER(name)  | web01   | "web01", by its source value                      |
    | FROM logs METADATA _id \| EVAL name = TO_UPPER(name)  | APP03   | no document, because the source holds "app03"     |
    | FROM logs METADATA _id \| EVAL name = TO_UPPER(name)  | DB02    | "DB02", by its source value                       |
    | FROM logs METADATA _id \| KEEP _id, name              | web01   | "web01"                                           |

Given the query FROM logs METADATA _id | EVAL name = TO_IP(name)
And an exception item with name is bogus
When the rule runs
Then the rule does not fail
And the item stays in the DSL filter, and the rule execution log does not record it

Given the query FROM logs | STATS n = COUNT(*) BY host.name
And an exception item with host.name is dc-01
When the rule runs
Then the item is applied in the DSL filter, before the aggregation, and only there
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A nested exception stays in the DSL filter, even when the query creates a column named like its path

**Priority:** P1

**Automation coverage**: 4 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/split_exception_items.test.ts`: "getFieldsToInspect › also lists the paths below a nested entry, so that the nested path is listed by _field_caps", "a column named like a nested path › stays in the DSL filter, because the nested path is a field of the source indices that the DSL searches", "a column named like a nested path › is not applied at the end of the query when the item also has a computed column"; `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "keeps a nested item in the DSL filter when the query outputs a column named like the nested path"), partial: the unit tests mock the answers of `_field_caps`, which lists a nested path only when a field below it is requested too.
```gherkin
Given an index where nested_user is a nested field with the keyword field name
And one document holds nested_user with the objects [{"name": "svc"}, {"name": "bob"}] and another holds [{"name": "alice"}]
And an exception item with a nested entry on nested_user whose inner entry is name is svc
When the rule runs with the query FROM logs | EVAL nested_user = "x" | STATS c = COUNT(*) BY nested_user
Then the item stays in the DSL filter and the document with the svc object is excluded before the STATS
And the final query has no WHERE stage for the item
And the rule execution log does not list the item as not applied

Given the same rule without a column named nested_user
When the rule runs
Then the result is the same

Given the query FROM logs | EVAL nested_user = "x", risk = "low" | STATS c = COUNT(*) BY nested_user, risk
And an exception item with a nested entry on nested_user and the entry risk is low
When the rule runs
Then the item is not applied, with the code entry_type_not_supported, and the rule execution log lists it
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A time range with no documents leaves the rule as it is without the feature

**Priority:** P1

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "does nothing when no index has documents in the time range, and the rule runs as it does without the feature", "applies the exceptions when at least one index has documents in the time range"), partial: the unit tests mock `_field_caps`.
```gherkin
Given an index logs-1 with the keyword field host.name, the long field n, and only a document from outside the time range of the rule
And an ES|QL rule with the query FROM logs-* METADATA _id
And an exception item with the entries host.name is a and n is 1.0
When the rule runs with the advanced setting enabled
Then the rule succeeds and creates no alerts
And the item stays in the DSL filter, so the value 1.0 is not checked and does not fail the rule
And the rule execution log has no esql_exceptions message
And no request for the output columns is sent

Given a document inside the time range is added
When the rule runs again
Then the rule still succeeds, and the item stays in the DSL filter
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A field that is mapped only in an index outside the time range does not make its name a source field

**Priority:** P1

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "asks _field_caps with the filter of the real request, so that it reads the indices that the query reads", "sends no filter to _field_caps when it has none"; `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/esql.test.ts`: "asks _field_caps with the time range and without the exceptions, and the probe with the exceptions"), partial: the unit tests mock the requests, not the indices that Elasticsearch reads.
```gherkin
Given an index logs-old with the keyword field tier and a document from outside the time range of the rule
And an index logs-new without the field tier and a document inside the time range
And an ES|QL rule over logs-* with the query FROM logs-* | EVAL tier = "gold" | KEEP _id, doc, tier
And an exception item with the entry tier is gold
When the rule runs with the advanced setting enabled
Then the item is applied at the end of the query and the final query ends with a WHERE stage for tier
And the alert for the document that holds gold is excluded

Given the same rule when the time range of the rule includes logs-old
When the rule runs
Then tier is a source field, so the item stays in the DSL filter and the final query has no WHERE stage
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A column named like an object parent is applied at the end of the query

**Priority:** P1

**Automation coverage**: 5 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/split_exception_items.test.ts`: "a column named like an object parent" (5 tests: placed at the end of the query, placed the same way with and without an item on `host.name`, needs the output columns, skipped when the query has no such column, kept in the DSL filter when another index maps the name with values)), partial: the unit tests mock the answer of `_field_caps`, not a running rule.
```gherkin
Given an index where host.name (keyword) holds "web-1" in two documents and "db-1" in one
And an ES|QL rule with the query FROM logs | STATS c = COUNT(*) BY host = host.name
And an exception list with one item: host is web-1
When the rule runs
Then no alert is created for "web-1"
And an alert is created for "db-1"
And the final query ends with NOT (MV_CONTAINS(host, "web-1"))

Given the same list also has an item with host.name is db-9
When the rule runs
Then the alerts are the same: none for "web-1" and one for "db-1"
And the item on host.name stays in the DSL filter
And the item on host is still applied at the end of the query
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A column named with a reserved word is quoted

**Priority:** P2

**Automation coverage**: 1 unit test (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "column names that are reserved words › quotes %s, which ES|QL does not accept as an unquoted column name" (parameterized)), partial: the unit test covers the compiler.
```gherkin
Given an ES|QL rule whose query defines a column with the name `first` (quoted in the query)
And an exception item with first is drop-me
When the rule runs
Then the rule succeeds
And the final query has MV_CONTAINS(`first`, "drop-me") with the name quoted
And the row that holds drop-me is excluded
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A comment at the end of the rule query does not swallow the exception stages

**Priority:** P2

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "toEndStageQuerySuffix › joins the items with AND and parentheses in one WHERE stage" (the stage starts on a new line); `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "starts the stages on a new line, so a comment at the end of the rule query does not swallow them"), partial: the unit tests cover how the query is written.
```gherkin
Given an ES|QL rule whose query ends with a // comment on its last line
And an exception item on a computed column
When the rule runs
Then the appended WHERE stage starts on a new line
And the row that the exception matches is excluded
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: After MV_EXPAND, an exception on a computed column excludes the row and an exception on the source field excludes the document

**Priority:** P2

**Automation coverage**: No existing tests found covering this scenario.
```gherkin
Given a document with t = ["x", "bad.com"] and the query FROM logs | MV_EXPAND t | EVAL c = t
When the rule runs with an exception on the source field t that is bad.com
Then neither row of the document creates an alert

When the rule runs with an exception on the computed column c that is bad.com
Then the row with bad.com is excluded
And the row with x creates an alert
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A keyword field with a normalizer differs between the DSL filter and a computed column

**Priority:** P2

**Automation coverage**: No existing tests found covering this scenario.
```gherkin
Given a keyword field k with a lowercase normalizer that holds ABC
And the query FROM logs | STATS c = COUNT(*) BY x = k
When the rule runs with an exception on the source field k that is ABC
Then the document is excluded before the aggregation

When the rule runs with an exception on the computed column x that is ABC
Then the row is not excluded, because x holds abc
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A date format that the compiler does not write fails the rule

**Priority:** P2

**Automation coverage**: 1 unit test (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "does not apply the unsupported date value %s on a %s column" (parameterized, including `2026-09-30Z` and the hour or minute only forms on `date_nanos`)), partial: the unit test covers the compiler.
```gherkin
Scenario Outline: Format that Elasticsearch rejects for the default date format
  Given an ES|QL rule whose query adds a column of type <type> with EVAL
  And an exception item with that column is <value>
  When the rule runs
  Then the rule fails as a user error before the query runs
  And the message names the item, the value and the field
  And no alerts are created

  Examples:
    | type       | value            |
    | date       | 2026-09-30Z      |
    | date       | 2026Z            |
    | date_nanos | 2026-09-30T14    |
    | date_nanos | 2026-09-30T14:05 |
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: More than 200 comparisons fail the rule, name the limit and the largest items

**Priority:** P1

**Automation coverage**: 4 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "accepts the comparisons that the limit allows, in one stage", "tells how many comparisons are needed and names the items with the most"; `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "fails the rule, and says how to reduce the exceptions, when they need more comparisons than allowed"; `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/esql.test.ts`: "fails the rule as a user error, without running the query, and names the limit when the exceptions do not fit in the query"), partial: the unit tests use mocked clients.
```gherkin
Given an ES|QL rule whose query adds an ip column with EVAL
And an exception item with that column is one of 60 CIDR values
When the rule runs
Then the rows in those ranges are excluded

Given an exception item with that column is one of 250 CIDR values
When the rule runs
Then the rule fails as a user error before the query runs
And the message says that the exceptions need 250 comparisons and that at most 200 are allowed
And the message names the item with the most comparisons
And the message tells the user to remove values or items, and that splitting an item does not help
And no alerts are created
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A text column is compared the same after STATS, LIMIT and MV_EXPAND

**Priority:** P1

**Automation coverage**: 1 unit test (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "applies an item on a text column as one on a keyword column, whatever the commands of the query"), partial: the unit test uses a mocked Elasticsearch client. Real rules run through Kibana (a script that is not in the repository) gave the same result with a `LIMIT 100` after the `EVAL`.
```gherkin
Scenario Outline: Query with commands after which a full-text function is rejected
  Given an index with a text field message and the documents "Connection to good.com failed", "GOOD morning" and "good.com"
  And an ES|QL rule with the query <query>
  And an exception item with the entry msg is "good.com"
  When the rule runs
  Then the rule execution log records the item as applied
  And no alert is created for the row of "good.com"
  And alerts are created for the other rows
  And the rule does not fail

  Examples:
    | query                                                                         |
    | FROM logs-* \| STATS n = COUNT(*) BY msg = message                            |
    | FROM logs-* \| STATS n = COUNT(*) BY message \| EVAL msg = message            |
    | FROM logs-* \| EVAL msg = message \| LIMIT 100                                 |
    | FROM logs-* \| EVAL msg = message \| MV_EXPAND tags                            |
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: "matches" and "does not match" on a text computed column compare the whole value and respect case, as on a keyword column

**Priority:** P1

**Automation coverage**: 1 unit test (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "compiles \"matches\" on a text column on the whole value, as a keyword column"), partial: the unit test covers the generated clause. Real rules run through Kibana (a script that is not in the repository) excluded the documents in the examples.
```gherkin
Scenario Outline: Wildcard exception on a text computed column
  Given an index with a text field message and the documents "Connection to good.com failed", "GOOD morning", "Good.com", "other thing", "GOOD.COM" and "good.com"
  And an ES|QL rule with the query FROM logs-* METADATA _id | EVAL msg = message
  And an exception item with the entry msg matches <pattern>
  When the rule runs
  Then no alert is created for <excluded>
  And alerts are created for the other documents

  Examples:
    | pattern | excluded                      |
    | good*   | "good.com"                    |
    | GOOD*   | "GOOD morning" and "GOOD.COM" |
    | *good.com* | "good.com"                 |
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A text source field and a computed text column can exclude different documents for the same exception

**Priority:** P2

**Automation coverage**: No existing tests found covering this scenario.
```gherkin
Given an index with a text field message and the documents "Connection to good.com failed" and "good.com"
And an ES|QL rule A with the query FROM logs-* METADATA _id and an exception item with the entry message is "good.com"
And an ES|QL rule B with the query FROM logs-* METADATA _id | RENAME message AS msg and an exception item with the entry msg is "good.com"
When both rules run
Then rule A creates no alert for either document, because the DSL filter compares the analyzed text
And rule B creates no alert for "good.com" only
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

</details>

---

<details>
<summary><strong>Items that are not applied and how they are reported</strong>: 14 scenarios (P0: 1, P1: 9, P2: 4)</summary>

#### Scenario: A value that the DSL filter would also fail on fails the rule

**Priority:** P0

**Automation coverage**: 6 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "reports the value of a %s column that cannot be written: %s" (parameterized), "reports a value that cannot be written even when an earlier entry is skipped for another reason"; `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "throws before the query runs", "names every item with an invalid value", "throws for a value that the DSL accepts and the compiler does not write"; `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/esql.test.ts`: "fails the rule as a user error, without running the query, when an exception has a value that cannot be written for its column"), partial: the unit tests use mocked clients, not a running rule.
```gherkin
Scenario Outline: Value that does not belong to the column type
  Given an ES|QL rule whose query adds a column of type <type> with EVAL
  And an exception item with the entry that column is <value>
  When the rule runs
  Then the rule status is failed before the query runs
  And the message names the item, its list, the value and the field
  And the failure is a user error
  And no alerts are created
  And no esql_exceptions message is written for the run

  Examples:
    | type    | value       |
    | ip      | bogus       |
    | ip      | 10.0.0.0/33 |
    | integer | many        |
    | boolean | TRUE        |

Scenario: The same value on a source field
  Given an ES|QL rule over an index with an ip field f
  And an exception item with the entry f is one of 10.0.0.9 and bogus
  When the rule runs
  Then the rule status is failed with the message "'bogus' is not an IP string literal"
  And no alerts are created
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A value that the DSL filter accepts and the compiler does not write fails the rule

**Priority:** P1

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "reports the value of a %s column that the DSL accepts and the compiler does not write: %s" (parameterized), "reports the date value %s on a %s column that the compiler does not write" (parameterized); `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "throws for a value that the DSL accepts and the compiler does not write"), partial: the unit tests use mocked clients, not a running rule.
```gherkin
Scenario Outline: Value that is accepted by the DSL filter
  Given an ES|QL rule whose query adds a column of type <type> with EVAL
  And an exception item with the entry that column is <value>
  When the rule runs
  Then the rule fails as a user error before the query runs
  And the message names the item, the value and the field
  And no alerts are created

  Examples:
    | type    | value                     |
    | integer | 2147483648                |
    | integer | 1e3                       |
    | long    | 1e3                       |
    | ip      | ::/0                      |
    | date    | 1759240800000             |
    | ip      | fe80::1%eth0/64           |
    | version | 99999999999999999999.1.1  |
    | version | x.y                       |
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: An item that has a computed column and a positive entry on a field that exists nowhere is not applied and creates no warning

**Priority:** P1

**Automation coverage**: 4 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/split_exception_items.test.ts`: "skips an item that has a computed column and an entry on a field that exists nowhere that is not negative, because the entry never matches", "skips an item that has a computed column and a nested entry on a path that exists nowhere", "names both reasons when an item has a computed column, a field that is nowhere and one that the query drops"; `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "does not apply an item that has a computed column and a field that is not part of the rule, and logs the reason"; `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/esql.test.ts`: "does not add a warning to the rule for an exception that cannot be applied"), partial: the unit tests mock the answers of Elasticsearch.
```gherkin
Given the advanced setting is enabled
And an ES|QL rule with STATS failures = COUNT(*) BY user.name
And an exception item with the entries failures is 3 and missing.field is x
When the rule runs
Then no warning is shown on the rule
And the rule execution log records the item as not applied with the code field_not_found for missing.field
And no alert is excluded by that item
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A negative entry on a field that exists nowhere is left out of an item with a computed column

**Priority:** P1

**Automation coverage**: 6 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/split_exception_items.test.ts`: "applies at the end of the query an item with a computed column and \"%s\" on a field that exists nowhere, without that entry" (4 tests: is not, is not one of, does not exist, does not match), "skips an item with a negative entry on a field that exists nowhere when another entry on a field that exists nowhere is not negative"; `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "applies an item with a computed column and a negative entry on a field that is not part of the rule, without that entry"), partial: the unit tests mock the answers of Elasticsearch.
```gherkin
Scenario Outline: The negative entry is true for every row
  Given the advanced setting is enabled
  And an ES|QL rule with STATS failures = COUNT(*) BY user.name
  And an exception item with the entries failures is 3 and missing.field <operator> (with the value x when the operator takes one)
  When the rule runs
  Then the final query ends with a stage that tests only failures
  And the alert row with failures 3 is excluded
  And the rows with another number of failures create alerts
  And the rule execution log lists the item as applied at the end of the query

  Examples:
    | operator   |
    | is not     |
    | is not one of |
    | does not exist |
    | does not match |

Scenario: The negative entry does not hide a positive entry on another field that exists nowhere
  Given an exception item with the entries failures is 3, missing.field is not x and other.missing is y
  When the rule runs
  Then no alert is excluded by that item
  And the rule execution log records the item as not applied with the code field_not_found for other.missing
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A column type that cannot be tested is not applied and is reported

**Priority:** P1

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "does not compile a column of type %s" (parameterized), "does not compile \"matches\" on a column that is not a string"), partial: the unit tests cover the compiler, not the rule execution log.
```gherkin
Scenario Outline: Exception on an unsupported column
  Given an ES|QL rule whose output has a column of type <type>
  And an exception item with the entry that column is <value>
  When the rule runs
  Then no warning is shown on the rule
  And the rule execution log records the item as not applied with the code column_type_not_supported and the column
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

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "does not compile a column of type %s" (parameterized), "does not compile \"matches\" on a column that is not a string"), partial: the unit tests cover the compiler, not the rule execution log.
```gherkin
Given an ES|QL rule whose output has a long column named count
And an exception item with the entry count matches 4*
When the rule runs
Then no warning is shown on the rule
And the rule execution log records the item as not applied with the code operator_not_supported_on_type
And no alert is excluded by that item
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A value list or nested entry on a computed column is not applied and is reported

**Priority:** P1

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/split_exception_items.test.ts` and `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "skips a value list on a computed column", "does not compile %s entries" (parameterized over list and nested)), partial: the unit tests cover the decision, not the rule execution log.
```gherkin
Given an ES|QL rule whose query adds a tier column with EVAL
And an exception item that uses a value list on the tier column
When the rule runs
Then no warning is shown on the rule
And the rule execution log records the item as not applied with the code entry_type_not_supported
And alerts are still created for every row
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: An item that needs a source field that the query does not output is not applied and creates no warning

**Priority:** P1

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/split_exception_items.test.ts` and `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "skips an item that needs a source field the query does not output", "names both reasons when an item has a computed column, a field that is nowhere and one that the query drops", "logs an item that needs a source field the query does not output"), partial: the unit tests do not check the alerts.
```gherkin
Given an ES|QL rule with STATS failures = COUNT(*) BY user.name
And an exception item with the entries host.name is web-01 and failures is 3
When the rule runs
Then no warning is shown on the rule
And the rule execution log records the item as not applied with the code source_field_not_output for host.name
And no alert is excluded by that item
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: The rule execution log has one JSON message with the final query, the applied items and the items that are not applied

**Priority:** P1

**Automation coverage**: 4 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_exceptions_log_entry.test.ts`: "describes the final query, the items applied at the end of the query and the items that are not applied", "leaves out the fields when none is known", "cuts the list of items that are not applied and says so", "cuts a query that is too long and says so"), partial: the unit tests cover the content of the entry, not that it reaches the event log.
```gherkin
Given extended rule execution logging is on at the Info level
And an ES|QL rule with exception items that are applied at the end of the query and items that are not applied
When the rule runs
Then the event log has one message of type esql_exceptions for the run
And the message holds the final query with the stage of the applied items
And each item that is not applied has a code, a reason and its fields
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: Splitting an item into several items does not change the count of comparisons

**Priority:** P2

**Automation coverage**: 1 unit test (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "reports the comparisons of all the items together, so that splitting an item does not help"), partial: the unit test checks the count, not the rule.
```gherkin
Given an ES|QL rule whose query adds an ip column with EVAL
And two exception items on that column, each one is one of 150 CIDR values
When the rule runs
Then the rule fails as a user error before the query runs
And the message says that the exceptions need 300 comparisons and that at most 200 are allowed
And the message names both items
And no alerts are created
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A rule query with many WHERE conditions of its own shares the clause budget with the exceptions

**Priority:** P2

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/esql.test.ts`: "explains that the exceptions count when Elasticsearch rejects the query for having too many clauses", "leaves the error of Elasticsearch as it is when no exception was added to the query"), partial: the unit tests mock the error, the real clause counting needs a real Elasticsearch.
```gherkin
Given an ES|QL rule over a source index whose query has 21 WHERE stages of 100 conditions on source fields
And the query renames a source field with RENAME host AS c
And the rule runs without an error when it has no exceptions
And an exception item on the column c with 200 comparisons
When the rule runs on a cluster whose clause limit is low
Then the rule fails as a user error
And the message says that the conditions of the rule query and the exceptions on columns that rename or copy a source field are counted together
And the message includes the Elasticsearch reason "too many nested clauses"
And no alerts are created

Given the same rule with an EVAL c = TO_UPPER(host) instead of the RENAME
When the rule runs
Then the rule runs without an error, because the comparisons on a computed value are not turned into clauses
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: An "is one of" list is written as one call, whatever its length

**Priority:** P2

**Automation coverage**: 4 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "tests the whole list with one call", "writes the list of a %s column as one value" (parameterized), "compiles a long list as one call, with no limit on the number of values", "does not compile an empty list"), partial: the unit tests cover the compiler, not the rule execution log.
```gherkin
Scenario Outline: "is one of" list size on a computed column
  Given an ES|QL rule whose query adds a keyword column with EVAL
  And an exception item with that column is one of <count> values
  When the rule runs
  Then the rows holding any of the values create no alert
  And the final query has one MV_INTERSECTS call for the item

  Examples:
    | count |
    | 1     |
    | 250   |
    | 5000  |
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: Items that would make the query longer than 1,000,000 characters fail the rule and name the limit

**Priority:** P2

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "reports the item that makes the query longer than the maximum length", "counts the query that the stage is appended to", "reports the comparisons before the length"; `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "fails the rule, and names the limit, when the items would make the query longer than ES|QL accepts"), partial: the unit tests use mocked clients.
```gherkin
Given an ES|QL rule with several exception items on a computed column, each an "is one of" with thousands of long values
And the items together would make the query longer than 1,000,000 characters
When the rule runs
Then the rule fails as a user error before the query runs
And the message says that the query would be longer than 1000000 characters, and names the item that makes it so
And no alerts are created
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: An item with os_types is not applied at the end of the query

**Priority:** P1

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "items with os_types › does not apply an item that is restricted to operating systems, which only the DSL filter applies", "items with os_types › applies an item with an empty os_types"), partial: the unit tests cover the compiler, not a running rule.
```gherkin
Given an ES|QL rule whose query adds a computed column
And an exception item with os_types windows and an entry on that column
When the rule runs
Then the item is not applied and the log records the code os_types_not_supported
And alerts are still created for every row

Given an exception item with os_types windows and an entry on a source field
When the rule runs
Then the item stays in the DSL filter with its os_types
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

</details>

---

<details>
<summary><strong>Advanced setting and failure handling</strong>: 5 scenarios (P0: 2, P1: 2, P2: 1)</summary>

#### Scenario: With the setting disabled, an exception on a computed column is not applied and no field lookup happens

**Priority:** P0

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/esql.test.ts`: "exceptions at the end of the query › does not look at the exceptions when the setting is off", "exceptions at the end of the query › does not inspect anything, and does not fail, when the setting is off", "exceptions at the end of the query › traces the whole request, as it always did, when the setting is off"), partial: the unit tests check that no field lookup happens, that a failing lookup does not matter and that the trace is unchanged, not the alerts.
```gherkin
Given the advanced setting is disabled
And an ES|QL rule with an exception item on a computed column
When the rule runs
Then alerts are created for every row
And the rule logs show no field lookup request
And nothing of the feature runs: no inspection, no validation of values, and no failure from either
And the trace log of the executor holds the whole request, as before the feature
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: If the fields cannot be inspected, the rule fails

**Priority:** P0

**Automation coverage**: 6 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "when the fields of the exceptions cannot be inspected › throws before the query runs when the field lookup fails, and names the reason", "when the fields of the exceptions cannot be inspected › throws when the output probe fails", "when the fields of the exceptions cannot be inspected › does not write to the rule execution log", "when the fields of the exceptions cannot be inspected › does not describe a failure to build the DSL filter as an inspection failure"; `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/esql.test.ts`: "exceptions at the end of the query › fails the rule, without running the query, when the exceptions cannot be inspected", "exceptions at the end of the query › keeps the user error classification of the failed request"), partial: the unit tests use mocked Elasticsearch clients.
```gherkin
Given the advanced setting is enabled
And the field lookup request, or the probe of the output columns, fails during the rule run
And an ES|QL rule with exception items
When the rule runs
Then the rule status is failed before the query runs
And the message says that the fields of the exceptions could not be inspected and includes the reason of the failed request
And no alerts are created
And the failure is a user error when the failed request is one (for example a missing privilege)
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: The setting applies to the rules of its own space only

**Priority:** P1

**Automation coverage**: No existing tests found covering this scenario.
```gherkin
Given two Kibana spaces, each with an ES|QL rule and the same exception on a computed column
And the setting is enabled in the first space and disabled in the second
When both rules run
Then the exception applies in the first space
And the second space behaves as it does today
And changing the setting in one space does not change the other
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A rule created before the setting was enabled uses it on its next run

**Priority:** P2

**Automation coverage**: No existing tests found covering this scenario.
```gherkin
Given an ES|QL rule created and run with the setting disabled
And the setting is then enabled, with no restart
When the rule runs again
Then the exceptions on computed columns apply without editing the rule
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: The probe of the output columns sends the filter of the real request

**Priority:** P1

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "sends the filter of the real request with the probe, so that it resolves the same indices"; `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/esql.test.ts`: "exceptions at the end of the query › sends the filter of the request with the probe of the output columns"), partial: the unit tests use mocked clients.
```gherkin
Given two indices of the rule where the field f is a keyword in an old index and a long in the index inside the time range
And an ES|QL rule over both indices with an exception item on a column computed from f
When the rule runs
Then the rule succeeds
And the exception is applied at the end of the query
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

#### Scenario: A field that is mapped later changes what its item matches, and the item stays in the DSL filter

**Priority:** P2

**Automation coverage**: No existing tests found covering this scenario.
```gherkin
Given an ES|QL rule with an exception item new.field is x, on a field that is not in the source indices
And the item stays in the DSL filter and excludes nothing
When the field is mapped in the source index, receives data, and the rule runs again
Then the item is still in the DSL filter
And it excludes the documents that hold the value
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

**Total scenarios:** 93

| Feature area | Scenarios | P0 | P1 | P2 | Automated | Manual only |
|---|---|---|---|---|---|---|
| Exceptions on source fields keep working | 25 | 11 | 12 | 2 | 18 | 7 |
| Exceptions on computed columns | 43 | 7 | 26 | 10 | 35 | 8 |
| Items that are not applied and how they are reported | 14 | 1 | 9 | 4 | 14 | 0 |
| Advanced setting and failure handling | 5 | 2 | 2 | 1 | 3 | 2 |
| Dependency data lifecycle | 4 | 0 | 2 | 2 | 0 | 4 |
| Spaces and cross-cluster search (to confirm) | 2 | 0 | 0 | 2 | 0 | 2 |
| **Total** | **93** | **21** | **51** | **21** | **70** | **23** |

**Automated coverage notes:**
- The Automated column counts scenarios with at least one matching unit or API integration test. Almost all of them are partial: the tests check the generated clause, the compiler or the split decision with mocked clients, not the alerts of a running rule. Only the "is" operator on one field has an API integration test.
- Unit tests (Jest) for the DSL filter builder in `x-pack/solutions/security/plugins/lists/server/services/exception_lists/build_exception_filter.test.ts`: they cover the DSL clause per entry type, not the result of an ES|QL rule.
- Unit tests (Jest) for the new code in `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/` (`build_end_stage_clause.test.ts`, `split_exception_items.test.ts`, `apply_end_stage_exceptions.test.ts`, `invalid_exception_values_error.test.ts`) and in `esql.test.ts` ("exceptions at the end of the query"): they cover the compiler, the split decision, the orchestration and the wiring with mocked Elasticsearch clients.
- API integration tests in `x-pack/solutions/security/test/security_solution_api_integration/test_suites/detections_response/detection_engine/rule_execution_logic/esql/trial_license_complete_tier/`: `esql.ts` and `esql_suppression.ts` each have one "with exceptions › should apply exceptions" test with an "is" entry on `client.ip`.
- Two scripts at the root of the repository run against a live stack. `esql_exceptions_smoke.mjs` creates lists with several exceptions, each with several items, one target document per exception and one document that no exception excludes, runs the rule through Kibana with the advanced setting enabled or disabled, and compares the alerts with what it expects. `esql_exceptions_try.mjs` is interactive: you describe an exception (where its field lives, its type, its operator, and whether its value is invalid), and it creates the rule, runs it and compares the alerts and the rule execution log with the expected placement. Two earlier runs, which are not in the repository, excluded the expected rows for 27 operator and type cases against Elasticsearch, and compared `is`, `matches` and their negatives on a computed `text` column with the same exceptions on a `keyword` field, through real rules in Kibana.
- Not covered: no Scout, Cypress or API integration test exercises exceptions on computed columns, the log message of skipped items, the advanced setting, or the regression matrix of operators and field types for ES|QL rules. Every scenario marked "No existing tests found" needs manual execution or a new automated test.

## Test Execution Notes

Run the scenarios of "Exceptions on source fields keep working" twice: with the advanced setting disabled (baseline) and with it enabled. The results must be identical.

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
- Alerts are identical with the setting enabled and disabled when every exception is on a source field
- An exception on a STATS output column excludes only the matching alert rows
- An exception on a renamed column excludes only that row and leaves the other rows unchanged
- An exception on an EVAL column excludes the rows with that value
- "is not" on a computed column excludes the rows with another value and the rows without a value
- "is one of" on a computed column excludes the rows that hold any of the values
- "is" on a text computed column excludes the rows by the whole value and respecting case, as on a keyword column
- A shared list with source-field items and computed-column items applies each item in the right place
- A value that the DSL filter would also fail on fails the rule
- "is not" on a field that exists nowhere excludes every document, with the setting disabled or enabled
- With the setting disabled, an exception on a computed column is not applied and no field lookup happens
- If the fields cannot be inspected, the rule fails

**P1: run before release, high-impact regressions:**
- "is not one of" excludes the documents that hold none of the values
- A value that the DSL filter accepts and the compiler does not write fails the rule
- The setting applies to the rules of its own space only
- An exception on a double column applies for "exists" only
- A source field that the query redefines or outputs stays in the DSL filter only
- A time range with no documents leaves the rule as it is without the feature
- A field that is mapped only in an index outside the time range does not make its name a source field
- A column named like an object parent is applied at the end of the query
- A nested exception stays in the DSL filter, even when the query creates a column named like its path
- An item with os_types is not applied at the end of the query
- The probe of the output columns sends the filter of the real request
- "does not match" excludes the documents whose value does not fit the pattern
- "does not exist" excludes the documents that lack the field
- A multi-valued field is excluded when any one of its values matches
- A date value excludes the unit that it names, and only the first day for a month or year value
- A nested entry excludes a document only when one nested object satisfies every inner entry
- A value list that cannot be processed is reported on the rule and the other exceptions still apply
- An item that has a computed column and a positive entry on a field that exists nowhere is not applied and creates no warning
- A negative entry on a field that exists nowhere is left out of an item with a computed column
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
- "is one of", "is not" and "is not one of" on a text computed column behave as on a keyword column for multi-valued, missing and mixed-case values
- An item with several entries on computed columns combines them with AND, including a negative entry
- An item that names a source field and a computed column is evaluated at the end of the query
- The exception stage works when the query ends with SORT and LIMIT
- A LIMIT in the rule query applies before an exception on a computed column, so the rule can return fewer alerts than the LIMIT
- An exception on a source field applies before the LIMIT, so the rule still returns as many alerts as the LIMIT
- A rule with more rows than the maximum alerts still creates the allowed number of alerts after the exceptions
- A row with no value in the computed column is kept by "is"
- A text column is compared the same after STATS, LIMIT and MV_EXPAND
- "matches" and "does not match" on a text computed column compare the whole value and respect case, as on a keyword column
- A column type that cannot be tested is not applied and is reported
- "matches" on a column that is not a string is not applied and is reported
- A value list or nested entry on a computed column is not applied and is reported
- An item that needs a source field that the query does not output is not applied and creates no warning
- A deleted exception item stops excluding on the next run, in both positions
- An edited exception value applies on the next run
- The rule execution log has one JSON message with the final query, the applied items and the items that are not applied
- Many exception items are joined with AND in one WHERE stage
- A CIDR value on a computed ip column excludes every address in the range, including multi-valued columns
- More than 200 comparisons fail the rule, name the limit and the largest items

**P2: run as capacity allows, limited blast radius:**
- A text source field and a computed text column can exclude different documents for the same exception
- A field mapped with different types in two indices is matched per index by the DSL filter
- Exceptions apply on a rule that uses alert suppression
- A date value on a computed date_nanos column excludes the unit that it names
- A multi-valued computed column is excluded when any value matches
- A column name with a hyphen or a dot can be used in an exception
- An aggregating rule with alert suppression applies the exception to the aggregated rows
- Splitting an item into several items does not change the count of comparisons
- A rule query with many WHERE conditions of its own shares the clause budget with the exceptions
- An "is one of" list is written as one call, whatever its length
- A rule created before the setting was enabled uses it on its next run
- A field that is mapped later changes what its item matches, and the item stays in the DSL filter
- Editing the rule query to rename a column changes where its exception applies
- Exceptions on a computed column apply for a rule in a non-default space
- Exceptions apply for a rule that reads a remote cluster
- Items that would make the query longer than 1,000,000 characters fail the rule and name the limit
- A column named with a reserved word is quoted
- A comment at the end of the rule query does not swallow the exception stages
- After MV_EXPAND, an exception on a computed column excludes the row and an exception on the source field excludes the document
- A keyword field with a normalizer differs between the DSL filter and a computed column
- A date format that the compiler does not write fails the rule

---

<details>
<summary>📊 Issue Clarity Assessment</summary>

Not applicable: no GitHub issue was used. The plan was derived from `esql_exceptions_proposal.md`, `esql_exceptions_v1_inventory.md` and the implementation on the branch `esql-end-stage-exceptions`. Create an issue for the work and regenerate the plan with the `test-plan-generator` skill if a scored assessment is needed. ⚠️

</details>

---

*🤖 Generated by claude-sonnet-5-5 on 2026-10-02*
