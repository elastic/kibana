# Test Plan: Exceptions for ES|QL rules, existing behavior and exceptions on the output columns of the query

## Overview

This test plan has two goals for the ES|QL rule type (`siem.esqlRule`). First, confirm that every exception that works today keeps working: exceptions on the source documents, applied as a DSL filter on the `_query` request. Second, validate the new capability: exceptions on the columns that the ES|QL query outputs, which the user chooses with `applies_to: esql_output_columns` and which the executor applies as one `WHERE` stage at the end of the query, together with the rules for items that cannot be applied and for items that declare a column type that is not the type that the query outputs.

## Feature Background

An ES|QL rule applies exceptions as a DSL filter that Elasticsearch runs on the source documents before the rule's ES|QL pipeline. An exception cannot reference a column that the pipeline computes with `STATS`, `EVAL` or `RENAME`, because the column does not exist when the filter runs. Each exception item now says what it applies to: `applies_to` absent or `source_documents` (every item created before this change) means the source documents, and `esql_output_columns` means the columns that the query outputs. Each entry of an item on the output columns declares its `column_type`, and the exceptions API validates the type, the operator and the value when the item is saved. The executor splits the items by `applies_to` and does not inspect the source indices to decide where an item goes: the source items are the DSL filter, as for every rule type, and the items on the output columns go only to ES|QL rules. A rule that has at least one item on the output columns that has not expired reads the output columns of its query with one `_query` request that ends in `| LIMIT 0` (the probe), and appends one `WHERE` stage to the query. An item with an entry that has an inclusive operator on a column that the query does not output is not applied and is recorded in the rule execution log, never as a rule warning. A declared column type that is not the type that the query outputs, and a stored value that the stage cannot write for its type, fail the rule. The design and the supported types are in `esql_exceptions_proposal.md`.

## Scope

**In scope:**
- Regression of every exception entry type and operator on source fields for the ES|QL rule type: "is", "is not", "is one of", "is not one of", "matches", "does not match", "exists", "does not exist", "is in list", "is not in list", and nested entries.
- Regression of rule-level behavior: multi-valued fields, date rounding, AND of entries and OR of items, aggregating rules, expired items, default and shared lists, rule preview, alert suppression.
- Exceptions on the output columns (`applies_to: esql_output_columns`) for the 11 supported column types and the four entry types (`match`, `match_any`, `wildcard`, `exists`) and their exclusive operators, including `text` columns that alias a source field, which are compared as `keyword` columns, on the whole value and respecting case.
- Placement by `applies_to`: items on the source documents (including every item that does not say what it applies to) in the DSL filter, items on the output columns at the end of the query of ES|QL rules only, a shared list on an ES|QL rule and on a query rule, and a source item and an item on the output columns with the same name that the query redefines.
- Items on the output columns that are not applied (an entry with an inclusive operator on a column that the query does not output, an item whose entries all have an exclusive operator on such columns) and how they are logged and reported, the items that the exceptions API refuses (unsupported types, operators, values, list and nested entries, `os_types`) with the second check of the executor for an item stored without that validation, and the rule failure when a declared column type is not the type that the query outputs.
- The limits of the end of the query (200 comparisons in one `WHERE` stage, 1,000,000 characters) and the failure that names them, the single `MV_INTERSECTS` call of an "is one of" list, the one probe request of the output columns (none when the rule has no item on them) and the failure path when the probe fails.
- Dependency data lifecycle: exception items deleted or edited between runs, mappings that change, rule queries that are edited.

**Out of scope:**
- Value lists as lookup indices with `LOOKUP JOIN`: a later iteration; value lists keep running through the DSL filter.
- In-memory filtering of large value lists: the ES|QL executor does not do it today and it is not part of this delivery.
- Applying source-field exceptions as a `WHERE` stage right after `FROM`: rejected in the proposal as too risky; the DSL filter stays.
- A `text` source field and a `text` computed column can exclude different documents for the same exception: the DSL filter compares the analyzed text of a source field, and a computed column is compared on the whole value as the exceptions documentation describes. This is documented in the proposal and covered by a manual scenario.
- Upgrade and migration scenarios: the change adds the optional attributes `applies_to` and `column_type` to the exception list item saved object (a new model version, with its own unit tests in `x-pack/solutions/security/plugins/lists/server/saved_objects/model_versions.test.ts`). An item stored before the change keeps working as a source item, which the placement scenarios cover; confirm the upgrade path before publishing.
- CRUD of exception lists and items, and of rules: the exceptions API, the import and the exception flyout have their own tests for `applies_to` and `column_type` (`applies_to.test.ts` in the lists plugin and in the exceptions common package, and the API integration tests in `applies_to_exception_list_items.ts`). The executor only reads these objects, and the scenarios here check only what the API refuses where the executor relies on it.
- Performance: outside the scope of the functional test plan.

## Terminology

| Term | Definition |
|---|---|
| Source field | A field of the documents of the indices in the rule's `FROM`. An item whose `applies_to` is absent or `source_documents` tests it, in the DSL filter, even when the query redefines the name. |
| Item on the output columns | An exception item whose `applies_to` is `esql_output_columns`. Each of its entries declares a `column_type`. It applies only to ES\|QL rules. |
| Computed column (transient column) | A column that exists only in the output of the ES\|QL query, created or renamed by `EVAL`, `STATS` or `RENAME`. An item on the output columns can also test a column that has the name of a source field, such as `host.name` after `STATS ... BY host.name`. |
| DSL filter | The Query DSL filter built from the items on the source documents and sent with the `_query` request; it runs on the source documents before the query. It never holds an item on the output columns. |
| Probe | The `_query` request of the rule query followed by a new line and `| LIMIT 0`, sent with the `filter` of the real request. It returns the name and the type of every output column. A rule sends it only when it has an item on the output columns that has not expired. |
| End of the query | The one `| WHERE` stage that the executor appends after the rule query for the items on the output columns. |
| Item and entry | An exception item holds one or more entries joined with AND; the items of a list are joined with OR. |

## Assumptions

- **License level:** ⚠️ Not confirmed. Use a license that allows ES|QL rules (trial or Enterprise for these runs).
- **User role:** A user who can create and edit rules and exception lists. No role matrix is tested (see Known Limitations).
- **Data setup:** A reference index with documents that have these fields: `host.name` (keyword), `user.name` (keyword), `message` (text), `process.pid` (long), `source.ip` (ip), `event.allowed` (boolean), `event.start` (date), `agent.version` (version), `labels` (flattened), `tags` (keyword, several values per document), `geo.loc` (geo_point) and `groups` (nested, with `name` and `role`). Documents are chosen per scenario so that one matches, one does not match and one lacks the field.
- **Rule execution log:** The messages of the scenarios that check the log are written only with extended rule execution logging: the experimental feature `extendedRuleExecutionLoggingEnabled` and a minimum level of Info or lower in the advanced setting "Extended rule execution logging: min level". They are read from `.kibana-event-log-*` (provider `securitySolution.ruleExecution`, action `message`).
- **Always on:** Exceptions on the output columns apply to every ES|QL rule that has an item with `applies_to: esql_output_columns`, from the next rule run, with nothing to enable. A rule with no such item that has not expired sends no probe request.
- **Reading the scenarios:** An exception on a source field is an item whose `applies_to` is absent or `source_documents`. In the areas "Exceptions on computed columns", "Items that are not applied or refused, and how they are reported" and "Failure handling", an exception on a computed column or on a column of the output is an item whose `applies_to` is `esql_output_columns`, and each of its entries declares the type of its column (`keyword` unless the scenario says another type). The exceptions API refuses the values, operators, entry types and attributes that the scenarios of refused items list. The executor checks them again, because an item can be stored without the API validation (for example written straight to the saved object). Those scenarios say "stored without the API validation".
- **Deployment type:** Self-managed (stateful). Serverless and ECH are not verified.
- **Elasticsearch version:** ⚠️ The design was checked on an Elasticsearch 9.6 snapshot. The minimum version that supports `MV_CONTAINS`, `MV_INTERSECTS`, `MV_LIKE` and `MV_IN_RANGE` is not confirmed; run the plan on every supported version before release.
- **Target version:** ⚠️ Not specified: please confirm before publishing (upgrade is recorded under Out of scope).

## Acceptance Criteria

No GitHub issue exists for this work. The criteria below are inferred from `esql_exceptions_proposal.md` and the implementation on the branch `esql-end-stage-exceptions`.

1. Every exception on the source documents (`applies_to` absent or `source_documents`) behaves as it does today: the DSL filter is built from the same items and excludes the same documents, for every rule type.
2. The executor splits the items by `applies_to` and does not read the data to decide where an item goes: no request reads the fields of the source indices. The DSL filter never holds an item on the output columns, and every rule type other than ES|QL drops these items. A source item on a field that the query redefines applies to the source field in the DSL filter, and an item on the output columns with the same name tests the column. A source item on a field that exists nowhere behaves as today: an exclusive operator such as "is not" still matches every document.
3. A rule with no item on the output columns that has not expired sends no probe request and builds the same request as today. A rule with at least one sends one `_query` request, `<rule query>` followed by a new line and `| LIMIT 0`, with the `filter` of the real request: the time range, the rule filters, the data tiers, the namespaces, the exception filter built from the source items only, and the excluded documents.
4. An item on the output columns is tested on the columns of the probe. An entry with an inclusive operator (is, is one of, matches, exists) on a column that the query does not output, or outputs with the type `null`, means that the item can never match: the item is skipped with the log code `field_not_found` and the reason `"<field>" is not in the output of the query`. An entry with an exclusive operator (is not, is not one of, does not match, does not exist) on such a column is true for every row and is left out of the stage. An item with no entry left is true for every row and excludes every row of the rule (the executor writes `| WHERE false`), as the DSL filter does for an exclusive operator on a field that exists nowhere. The rule shows a warning (status partial failure) that names the item and says that the rule creates no alerts because of it. Product chose this over a failure and over no warning.
5. A column that the query outputs with another type than the entry declares fails the rule before the query runs, as a user error, with the message `The rule did not run because exception items declare a column type that is not the type that the query outputs: "<item name>" (list "<list_id>", item "<item_id>") declares the column "<field>" as <declared>, and the query outputs it as <actual>. Fix the type in these exception items, or remove them from this rule.` The message names the first 5 and then ` and N more`. The declared type has to be the output type exactly.
6. The items that apply are appended as one `| WHERE` stage on a new line, placed before the final limit that the executor adds.
7. The API validates the type, the operator and the value of each entry when the item is saved. `exists` is allowed on all 11 types (`keyword`, `text`, `boolean`, `integer`, `long`, `unsigned_long`, `double`, `ip`, `version`, `date`, `date_nanos`), "is" and "is one of" on all but `double` (a `float` is widened to `double`, and an equality can miss the value), and "matches" on `keyword` and `text` only. An item on the output columns has no `list` or `nested` entry and no `os_types`, and lives only in a `detection` or `rule_default` list. A `text` column is compared as a `keyword` column, on the whole value and respecting case, as the exceptions documentation describes. No full-text function is used, and the commands of the rule query do not matter.
8. Values are cast to the column type, and a value that does not cast never excludes every row. A stored value that the stage cannot write for its declared type, or an entry with no `column_type`, fails the rule before the query runs, as a user error, with the message `The rule did not run because exception items have a value or a column type that cannot be used at the end of the query: <items>. Fix or delete these exception items.` The message names the item, its list, the value and the field of the first 5 items. That covers a value that is not valid for the type (`bogus` for an `ip` column) and a value that is valid but that the compiler does not write (`1e3` on a `long` column, a date in an unsupported format).
9. An item that cannot be applied adds no warning to the rule, with one exception: an item that excludes every row (see criterion 4) adds one warning. The rule execution log has one JSON message for the run (type `esql_exceptions`) with the final query, the items applied at the end of the query, and for each item that is not applied a stable code, a reason and its fields.
10. The items at the end of the query are written in one `WHERE` stage of at most 200 comparisons, in a query of at most 1,000,000 characters. A limit that the items reach fails the rule as a user error, before the query runs, and the message names the limit and the items with the most comparisons, and tells the user to remove values or items. An "is one of" list is written as one `MV_INTERSECTS` call and has no limit on its number of values besides the length of the query. When Elasticsearch rejects the query for too many clauses, the message says that the WHERE expressions of the rule query and the exceptions on the output columns are counted together.
11. A `text` column is compared the same after any command of the rule query, `LIMIT`, `STATS` and `MV_EXPAND` included, because the comparison is a plain `MV_CONTAINS`, `MV_INTERSECTS` or `MV_LIKE` and not a full-text function. The probe is the only request that the exceptions add.
12. If the probe fails, the rule fails before the query runs, with the message `The rule did not run because the output columns of its query could not be read to apply its exceptions on them: <reason of the failed request>`, and no alerts are created. It is a user error only when the failed request is one. Nothing of this runs for a rule with no item on the output columns.
13. Expired items are not applied in either position, and a rule whose only items on the output columns expired sends no probe.
14. An item on the output columns with `os_types` is refused by the API, and the executor skips one that is stored anyway with the code `os_types_not_supported`. A source item keeps its `os_types` in the DSL filter. A column named with a word that ES|QL reserves (`first`, `by`) is quoted, and a comment at the end of the rule query does not swallow the appended stages.

## Known Limitations

- ⚠️ No GitHub issue is linked. The Issue Clarity Assessment at the end of the plan is not applicable, and the acceptance criteria are inferred from the proposal.
- ⚠️ The implementation was verified with unit tests, with a script against a live Elasticsearch (27 operator and type cases) and with an interactive script that creates a rule through Kibana (single and mixed exceptions, `is one of` on several types, invalid values, a missing field). The scenarios in this plan are the first complete end-to-end check: they cover the operator and type matrix, several rule queries, spaces and cross-cluster search, which those runs did not.
- A source item on a field that exists nowhere stays in the DSL filter, and an exclusive operator such as "is not" on such a field still excludes every document, as it does today. The Elastic documentation does not describe this result: it only warns that an exception on an unmapped field can prevent the exception from working as expected. Scenario "\"is not\" on a field that exists nowhere excludes every document" records it. An item on the output columns behaves differently on a column that the query does not output: an entry with an exclusive operator is left out of the stage, an entry with an inclusive operator makes the item not applied, and an item with only entries that have an exclusive operator excludes every row and warns the rule.
- ⚠️ Exceptions on computed columns run at the end of the rule query, after any `LIMIT` the rule has: a rule with `LIMIT n` can return fewer than `n` alerts. This was decided on purpose (see the proposal, "The stage goes after any LIMIT") and the two scenarios about `LIMIT` record the expected result.
- ⚠️ ES|QL rejects a query of more than 1,000,000 characters, which is not documented. The executor fails the rule before the query runs when the final query would pass that length (a few characters are kept for the page size), and the message names the limit.
- ⚠️ The exception items are joined with `AND` in one `WHERE` stage of at most 200 comparisons in total. A rule whose exceptions on computed columns need more fails, and splitting an item into several items does not help, because all the comparisons are counted together.
- ⚠️ The limits of the end of the query are a new restriction that applies only there, and a rule that reaches one fails; the DSL filter has no such limits today.
- ⚠️ The area "Spaces and cross-cluster search (to confirm)" is included because rules are space-aware and the probe of the output columns queries Elasticsearch indices, including remote ones. Confirm that both are in the release scope before executing it.
- ⚠️ The scenario "If the output columns cannot be read, the rule fails" needs a failing probe request, which is hard to cause by hand; it is best covered by an automated test with a failing Elasticsearch client.
- ⚠️ A rule with at least one item on the output columns that has not expired sends one more `_query` request on every run (the probe). A rule with none sends none.
- ⚠️ The declared column type belongs to the item. When a user edits the rule query so that a column has another type, the rule fails until the type is fixed in the items or the items are removed from the rule.
- ⚠️ The exceptions API refuses a value, an operator, an entry type or an attribute that the end of the query cannot test, and the executor fails or skips the same cases again for an item that is stored without that validation. The scenarios that need such an item ("stored without the API validation") need the saved object to be written directly; unit tests cover that second check best.
- ⚠️ A `text` source field stays in the DSL filter, where `is` ignores the case and finds the value inside a longer one, and `matches` compares lowercase tokens. The exceptions documentation says that exceptions are case-sensitive: the same exception can exclude different documents on a source field and on a computed column. Run the manual scenario about it and agree the wording of the user documentation.
- ⚠️ The minimum Elasticsearch version for the ES|QL functions used at the end of the query is not confirmed (see Assumptions).
- Required testing types: positive, negative, edge-case and error-handling scenarios are present in the first four areas. State-based coverage is in "Dependency data lifecycle". Performance, accessibility, i18n and visual testing are outside the scope of this skill.
- Optional sections not included: RBAC (the proposal does not change privileges) and multi-tenant (serverless is not in scope).
- Float and half-float columns computed from a source field are not covered because equality with typed decimals does not work at the end of the query; the types are listed as unsupported in the proposal.
- The team critical-workflows map for the Security Solution was applied: "Rule execution and alert generation" is P0: scenarios whose failure would change which alerts a rule creates are P0.

## Test Scenarios

<details>
<summary><strong>Exceptions on source fields keep working</strong>: 24 scenarios (P0: 10, P1: 12, P2: 2)</summary>

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

#### Scenario: "is not" on a field that exists nowhere excludes every document

**Priority:** P0

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/utils/get_exception_items_for_rule.test.ts`: "gives an ES|QL rule the items on the source documents and the items on the output columns apart", "gives another rule type every item that does not say what it applies to, as it always did") (getExceptionItemsForRule), partial: they cover the split that sends every source item to the DSL filter, not the alerts of a running rule. 1 unit test (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/esql.test.ts`: "exceptions at the end of the query › does not read the fields of the source indices, because the items say what they apply to"), partial: the executor does not read the source indices.
```gherkin
Scenario: An exclusive operator on a field that no document has
  Given an ES|QL rule whose query returns every document of the reference index
  And an exception item on the source documents with the entry missing.field is not x
  When the rule runs
  Then no alert is created for any document
  And the rule execution log has no esql_exceptions message, because the rule has no item on the output columns

Scenario: The same exclusive operator in an item with a source field
  Given an exception item with the entries missing.field is not x and host.name is web-01
  When the rule runs
  Then no alert is created for the web-01 documents
  And the alerts for the other documents are created

Scenario: An inclusive operator on a field that no document has
  Given an exception item with the entry missing.field is x
  When the rule runs
  Then alerts are created for every document

Scenario: A nested entry on a path that is not mapped
  Given an exception item with a nested entry on ghost_nested, with the inner entry name is svc
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

**Automation coverage**: 5 unit tests (`x-pack/solutions/security/plugins/lists/server/services/exception_lists/build_exception_filter.test.ts`: "it should remove all exception items that are expired", "it should filter out expired exceptions" (buildExceptionFilter, removeExpiredExceptions); `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/esql.test.ts`: "exceptions at the end of the query › expiry › drops an item that expired before the execution started, although it expires after the end of the time range", "exceptions at the end of the query › expiry › applies an item that expires after the execution started", "exceptions at the end of the query › does not read the output columns when the rule %s" (parameterized: no exceptions on the output columns, only an expired exception on the output columns)), partial: they cover the filter builder and the executor with mocked clients, not the rule result.
```gherkin
Given an ES|QL rule whose query returns every document of the reference index
And an exception item with the entry host.name is web-01 whose expiration date is in the past
When the rule runs
Then an alert is created for the web-01 documents

Scenario: The expiry is decided at the start of the execution
  Given an ES|QL rule with to: now-5m
  And an exception item on the output columns that expired 3 minutes before the execution started
  And a second item on a source field that expires 1 minute after the execution started
  When the rule runs
  Then the first item is not applied
  And no probe request is sent, because the only item on the output columns expired
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
<summary><strong>Exceptions on computed columns</strong>: 42 scenarios (P0: 8, P1: 24, P2: 10)</summary>

In this area, an exception on a computed column or on a column of the output is an item with `applies_to: esql_output_columns` whose entries declare the type of their column, and an exception on a source field is an item with `applies_to` absent or `source_documents`.

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

#### Scenario: A shared list with source items and output-column items applies each item in the right place, and a query rule drops the output-column items

**Priority:** P0

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/utils/get_exception_items_for_rule.test.ts`: "gives an ES|QL rule the items on the source documents and the items on the output columns apart", "does not give another rule type the items that apply to the ES|QL output columns", "gives another rule type every item that does not say what it applies to, as it always did") (getExceptionItemsForRule), partial: they cover the split of the items, not the alerts. 2 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/esql.test.ts`: "exceptions at the end of the query › appends the exceptions on the output columns to the query, before the limit", "exceptions at the end of the query › sends the data tier filter and the exception filter with the probe, as the real request does"), partial: the unit tests mock Elasticsearch.
```gherkin
Given a shared list with three items
  | item                              | applies_to           |
  | user.name is vuln-scanner         | source_documents     |
  | host.name is web-09               | absent               |
  | target_host is dc-01 (keyword)    | esql_output_columns  |
And an ES|QL rule linked to the list that groups by host.name, renames it to target_host and counts distinct users
And a custom query rule linked to the same list
When the ES|QL rule runs
Then the vuln-scanner events and the web-09 documents are excluded before the count
And no alert is created for dc-01
And the DSL filter of the request has no condition on target_host

When the query rule runs
Then the vuln-scanner and the web-09 documents create no alert
And the item on target_host is dropped, with no error and no warning
And alerts are created for the dc-01 documents
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

#### Scenario: An item with several entries on computed columns combines them with AND, including an entry with an exclusive operator

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

#### Scenario: An item on the output columns tests every entry on the columns of the output, including one named like a source field

**Priority:** P1

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/resolve_end_stage_items.test.ts`: "writes an item whose columns the query outputs with the declared types"; `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "combines the entries with AND"), partial: the unit tests cover the resolution against the output columns and the clause, not the alerts.
```gherkin
Given an ES|QL rule that outputs host.name and a computed tier column
And one exception item on the output columns with the entries host.name is web-01 and tier is gold
And rows exist with web-01 and tier gold, with web-01 and tier silver, and with db-01 and tier gold
When the rule runs
Then no alert is created for the row with host.name web-01 and tier gold
And alerts are created for the other two rows
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: The exception stage works when the query ends with SORT and LIMIT

**Priority:** P1

**Automation coverage**: 1 unit test (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/esql.test.ts`: "exceptions at the end of the query › appends the exceptions on the output columns to the query, before the limit"), partial: the unit test mocks Elasticsearch.
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

#### Scenario: A LIMIT in the rule query applies before an exception on a computed column and the rule can return fewer alerts than the LIMIT

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

#### Scenario: An exception on a source field applies before the LIMIT and the rule still returns as many alerts as the LIMIT

**Priority:** P1

**Automation coverage**: No existing tests found covering this scenario.
```gherkin
Given an ES|QL rule with the query FROM reference | STATS failures = COUNT(*) BY host | SORT failures DESC | LIMIT 5
And an exception item on the source documents with the entry host is the host with the most failures
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

**Automation coverage**: 10 unit tests (`x-pack/solutions/security/packages/kbn-securitysolution-exceptions-common/esql_output_columns/ip_range.test.ts` and `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "gives the first and the last address of the IPv4 value %s" (parameterized), "gives the first and the last address of the IPv6 value %s" (parameterized), "does not accept %s" (parameterized), "writes a CIDR value as a range of addresses, so any value of a multi-valued column can match", "ignores the bits of the address after the prefix, as Elasticsearch does", "keeps the rows in the range for \"is not\"", "writes an IPv6 prefix as a range", "mixes addresses and ranges in an \"is one of\" list"), partial: the unit tests cover the generated clause. A script against a live Elasticsearch (not in the repository) compared 19 CIDR cases (IPv4, IPv6, unaligned prefixes, multi-valued and missing values, "is not", "is one of") with the DSL, and the excluded documents were the same in all of them.
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

#### Scenario: An exception on a computed column excludes rows before alert suppression: they create no alert and are not counted as suppressed

**Priority:** P1

**Automation coverage**: 1 API integration test (`x-pack/solutions/security/test/security_solution_api_integration/test_suites/detections_response/detection_engine/rule_execution_logic/esql/trial_license_complete_tier/esql_suppression.ts`: "with exceptions › on a column that the query computes › should create no alert for the rows that the exception excludes and not count them as suppressed"), 2 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/esql.test.ts`: "exceptions at the end of the query › with alert suppression › applies the exceptions at the end of the query and gives the suppression the rows that remain", "exceptions at the end of the query › with alert suppression › fails the rule before the query runs when an exception has a value that cannot be written, as it does without suppression"), and the script `esql_exceptions_suppression.mjs` (scenario 1), partial: the unit tests mock Elasticsearch, and the API integration test is written but has not been run yet.
```gherkin
Given an ES|QL rule with the query "FROM idx METADATA _id | EVAL tier = TO_UPPER(tier_src) | KEEP _id, doc, host, user, tier"
And alert suppression on host, per rule execution
And the exception items "tier is GOLD" (on the output columns, column type keyword) and "user is svc" (on the source documents)
And host-a has 4 rows with tier GOLD
And host-b has 3 rows with tier SILVER
And host-c has 2 rows with tier SILVER and 1 row with tier GOLD
And host-d has 2 rows with user svc
And host-e has 1 row with user svc and 1 row with user bob
When the rule runs
Then host-a and host-d have no alert
And host-b has one alert with 2 suppressed documents
And host-c has one alert with 1 suppressed document, because the excluded row is not counted
And host-e has one alert with 0 suppressed documents
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A rule with alert suppression over a time window applies the exception on every run

**Priority:** P1

**Automation coverage**: No existing tests found covering this scenario. The script `esql_exceptions_suppression.mjs` (scenario 2) runs it against a live stack.
```gherkin
Given the rule and the exception items of the previous scenario, with alert suppression on host over 30 minutes
And a first run that created alerts for host-b, host-c and host-e
When 2 rows with tier GOLD arrive for host-a, 1 SILVER and 1 GOLD row for host-b, 1 GOLD row for host-c, 1 SILVER row for host-e, and 1 SILVER and 1 GOLD row for host-f
And the rule runs again
Then host-a still has no alert
And the alert of host-b has 3 suppressed documents, because only the SILVER row is added
And the alert of host-c is unchanged
And the alert of host-e has 1 suppressed document
And host-f has a new alert with 0 suppressed documents
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: An exception on a double column applies for "exists" only

**Priority:** P1

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "double columns › does not apply \"%s\", because a float is widened and an equality can miss the value", "double columns › still applies \"exists\"", "double columns › does not apply \"is\" on a double column, whatever the value" (the first one is parameterized)), 1 unit test (`x-pack/solutions/security/plugins/lists/server/services/exception_lists/applies_to.test.ts`: "rejects a value that does not fit its column_type, and an operation that the type does not support"), partial: the unit tests cover the compiler and the refusal when the item is saved, not a float field in a running rule.
```gherkin
Scenario Outline: Operators on a double column
  Given an ES|QL rule whose query groups a float field with STATS ... BY g = f
  And an exception item on the output columns with the entry g <operator> <value> and the column type double
  When the user saves the item
  Then <result>

  Examples:
    | operator      | value | result                                                                                          |
    | is            | 0.1   | the API refuses the item, and says that the entry type is not supported on a column of type double |
    | is not        | 0.1   | the API refuses the item, as for "is"                                                           |
    | is one of     | 0.1   | the API refuses the item, as for "is"                                                           |
    | is not one of | 0.1   | the API refuses the item, as for "is"                                                           |
    | exists        |       | the item is saved                                                                               |

Scenario: "exists" on a double column
  Given a saved item with the entry g exists and the column type double
  When the rule runs
  Then the rows with a value in g are excluded

Scenario: An item with "is" on a double column that is stored without the API validation
  Given an item with the entry g is 0.1 and the column type double
  When the rule runs
  Then the item is not applied and the rule execution log records the code operator_not_supported_on_type
  And the row alerts
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: Placement follows applies_to: a source item and an item on the output columns with the same name test different values

**Priority:** P0

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/utils/get_exception_items_for_rule.test.ts`: "gives an ES|QL rule the items on the source documents and the items on the output columns apart", "gives another rule type every item that does not say what it applies to, as it always did"; `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/esql.test.ts`: "exceptions at the end of the query › does not read the fields of the source indices, because the items say what they apply to"), 1 unit test (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/resolve_end_stage_items.test.ts`: "writes an item whose columns the query outputs with the declared types"), partial: the unit tests cover the split of the items and the absence of a field lookup with mocked clients, not the alerts.
```gherkin
Scenario Outline: A query that redefines a source field
  Given an index with a keyword field name that holds "web01", "DB02" and "app03"
  And an ES|QL rule with the query FROM logs METADATA _id | EVAL name = TO_UPPER(name)
  And an exception item with name is <value> and <applies_to>
  When the rule runs
  Then no alert is created for <excluded>
  And the rule sends a probe request only when the item applies to the output columns

  Examples:
    | applies_to                                         | value | excluded                                       |
    | no applies_to (an item created before the change)  | web01 | "web01", by its source value                   |
    | applies_to source_documents                        | web01 | "web01", by its source value                   |
    | applies_to source_documents                        | APP03 | no document, because the source holds "app03"  |
    | applies_to esql_output_columns, column type keyword | APP03 | "app03", because the column holds "APP03"      |
    | applies_to esql_output_columns, column type keyword | web01 | no document, because the column holds "WEB01"  |

Scenario: A source item on a field that the query turns into another type
  Given the query FROM logs METADATA _id | EVAL name = TO_IP(name)
  And an exception item on the source documents with name is bogus
  When the rule runs
  Then the rule does not fail
  And the item is in the DSL filter, and the rule execution log has no esql_exceptions message

  Given an exception item on the output columns with name is bogus and the column type ip
  When the user saves the item
  Then the API refuses it because "bogus" is not valid for a column of type ip

Scenario: An aggregation
  Given the query FROM logs | STATS n = COUNT(*) BY host.name
  And an exception item on the source documents with host.name is dc-01
  When the rule runs
  Then the item is applied in the DSL filter, before the aggregation, and only there

  Given an exception item on the output columns with host.name is dc-01 and the column type keyword
  When the rule runs
  Then the aggregation counts the dc-01 documents
  And the final query has a WHERE stage that removes its row
  And no alert is created for dc-01
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A nested exception stays in the DSL filter, even when the query creates a column named like its path

**Priority:** P1

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/lists/server/services/exception_lists/build_exception_filter.test.ts`: "it should build nested filter when operator is \"included\"", "it should build nested filter when operator is \"excluded\"", "it should build nested filter with mixed entry types") (buildNestedClause), 1 unit test (`x-pack/solutions/security/plugins/lists/server/services/exception_lists/applies_to.test.ts`: "rejects an item with os_types, a value list and a nested entry"), partial: the unit tests cover the DSL clause and the refusal when the item is saved, not the rule result.
```gherkin
Given an index where nested_user is a nested field with the keyword field name
And one document holds nested_user with the objects [{"name": "svc"}, {"name": "bob"}] and another holds [{"name": "alice"}]
And an exception item on the source documents with a nested entry on nested_user whose inner entry is name is svc
When the rule runs with the query FROM logs | EVAL nested_user = "x" | STATS c = COUNT(*) BY nested_user
Then the item stays in the DSL filter and the document with the svc object is excluded before the STATS
And the final query has no WHERE stage for the item
And the rule execution log has no esql_exceptions message

Given the same rule without a column named nested_user
When the rule runs
Then the result is the same

Given an exception item on the output columns with a nested entry on nested_user
When the user saves the item
Then the API refuses it because the entry has the type "nested"
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

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "toEndStageQuerySuffix › joins the items with AND and parentheses in one WHERE stage" (the stage starts on a new line); `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "appends the items to the query as one WHERE stage on a new line, so a comment at the end of the rule query does not swallow it"), partial: the unit tests cover how the query is written.
```gherkin
Given an ES|QL rule whose query ends with a // comment on its last line
And an exception item on a computed column
When the rule runs
Then the appended WHERE stage starts on a new line
And the probe ends with a new line and LIMIT 0
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

#### Scenario: A date format that the compiler does not write is refused when the item is saved, and fails the rule if it is stored without the API validation

**Priority:** P2

**Automation coverage**: 1 unit test (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "reports the date value %s on a %s column that the compiler does not write" (parameterized, including `2026-09-30Z` and the hour or minute only forms on `date_nanos`)), 1 unit test (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "values that cannot be written for the type of the column › throws before the query runs"), partial: the unit tests cover the compiler and the failure with mocked clients.
```gherkin
Scenario Outline: Format that Elasticsearch rejects for the default date format
  Given an ES|QL rule whose query adds a column of type <type> with EVAL
  And an exception item on the output columns with that column is <value> and the column type <type>
  When the user saves the item
  Then the API refuses the item and names the value

  Examples:
    | type       | value            |
    | date       | 2026-09-30Z      |
    | date       | 2026Z            |
    | date_nanos | 2026-09-30T14    |
    | date_nanos | 2026-09-30T14:05 |

Scenario: The same item stored without the API validation
  Given the item with the date value 2026-09-30Z for a date column
  When the rule runs
  Then the rule fails as a user error before the query runs
  And the message names the item, the value and the field
  And no alerts are created
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

**Automation coverage**: 1 unit test (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "writes the items of a text column as the items of a keyword column, and joins several items in one stage"), partial: the unit test uses a mocked Elasticsearch client and does not run the commands of the examples. Real rules run through Kibana (a script that is not in the repository) gave the same result with a `LIMIT 100` after the `EVAL`.
```gherkin
Scenario Outline: Query with commands after which a full-text function is rejected
  Given an index with a text field message and the documents "Connection to good.com failed", "GOOD morning" and "good.com"
  And an ES|QL rule with the query <query>
  And an exception item on the output columns with the entry msg is "good.com" and the column type text
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
<summary><strong>Items that are not applied or refused, and how they are reported</strong>: 14 scenarios (P0: 1, P1: 9, P2: 4)</summary>

In this area, an item on the output columns declares the type of each of its columns. "Stored without the API validation" means an item that is written straight to the saved object, which the exceptions API would refuse.

#### Scenario: A value that does not fit the column type is refused when the item is saved, and fails the rule if it is stored without the API validation

**Priority:** P0

**Automation coverage**: 6 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "reports the value of a %s column that cannot be written: %s", "reports a value that cannot be written together with the entries that are skipped for another reason" (the first one is parameterized); `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "values that cannot be written for the type of the column › throws before the query runs", "values that cannot be written for the type of the column › names every item with an invalid value"; `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/esql.test.ts`: "exceptions at the end of the query › fails the rule as a user error, without running the query, when an exception has a value that cannot be written for its column"; `x-pack/solutions/security/plugins/lists/server/services/exception_lists/applies_to.test.ts`: "rejects a value that does not fit its column_type, and an operation that the type does not support"), 1 API integration test (`x-pack/solutions/security/test/security_solution_api_integration/test_suites/lists_and_exception_lists/exception_lists_items/trial_license_complete_tier/items/applies_to_exception_list_items.ts`: "items that apply to the ES|QL output columns › name every entry that cannot be saved"), partial: the unit tests use mocked clients, not a running rule.
```gherkin
Scenario Outline: Value that does not belong to the column type
  Given an ES|QL rule whose query adds a column of type <type> with EVAL
  And an exception item on the output columns with the entry that column is <value> and the column type <type>
  When the user saves the item
  Then the API refuses it and the message names the value and the column type
  And the item is not stored

  Examples:
    | type    | value       |
    | ip      | bogus       |
    | ip      | 10.0.0.0/33 |
    | integer | many        |
    | boolean | TRUE        |

Scenario Outline: The same item stored without the API validation
  Given an item with the entry that column is <value> and the column type <type>, stored without the API validation
  When the rule runs
  Then the rule status is failed before the query runs
  And the message starts with "The rule did not run because exception items have a value or a column type that cannot be used at the end of the query"
  And the message names the item, its list, the value and the field
  And the message ends with "Fix or delete these exception items."
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
  And an exception item on the source documents with the entry f is one of 10.0.0.9 and bogus
  When the rule runs
  Then the rule status is failed with the message "'bogus' is not an IP string literal"
  And no alerts are created
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A value that the DSL filter accepts and the compiler does not write is refused when the item is saved, and fails the rule if it is stored without the API validation

**Priority:** P1

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "reports the value of a %s column that the DSL accepts and the compiler does not write: %s", "reports the date value %s on a %s column that the compiler does not write" (both parameterized); `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "values that cannot be written for the type of the column › throws before the query runs"), 1 unit test (`x-pack/solutions/security/plugins/lists/server/services/exception_lists/applies_to.test.ts`: "rejects a value that does not fit its column_type, and an operation that the type does not support"), partial: the unit tests use mocked clients, not a running rule.
```gherkin
Scenario Outline: Value that is accepted by the DSL filter
  Given an ES|QL rule whose query adds a column of type <type> with EVAL
  And an exception item on the output columns with the entry that column is <value> and the column type <type>
  When the user saves the item
  Then the API refuses it and the message names the value

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

Scenario Outline: The same item stored without the API validation
  Given an item with the entry that column is <value> and the column type <type>, stored without the API validation
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

#### Scenario: An item with an entry that has an inclusive operator on a column that the query does not output is not applied and creates no warning

**Priority:** P1

**Automation coverage**: 6 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/resolve_end_stage_items.test.ts`: "skips an item with an entry that has an inclusive operator on a column that the query does not output, because it never matches", "names every column that the query does not output, once", "treats a column of the type null as a column that the query does not output"; `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "leaves the query as it is, and logs the reason, when no item can be applied", "writes one JSON message to the rule execution log with the final query and what was applied"; `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/esql.test.ts`: "exceptions at the end of the query › does not add a warning to the rule for an exception on a column that the query does not output"), partial: the unit tests mock the answers of Elasticsearch.
```gherkin
Scenario: A column that the query does not output
  Given an ES|QL rule with STATS failures = COUNT(*) BY user.name
  And an exception item on the output columns with the entries failures is 3 and missing.field is x
  When the rule runs
  Then no warning is shown on the rule
  And the rule execution log records the item as not applied with the code field_not_found for missing.field
  And the reason is "missing.field" is not in the output of the query
  And no alert is excluded by that item

Scenario: A source field that the query drops
  Given the same rule
  And an exception item on the output columns with the entries host.name is web-01 and failures is 3
  When the rule runs
  Then no warning is shown on the rule
  And the rule execution log records the item as not applied with the code field_not_found for host.name
  And no alert is excluded by that item

Scenario: A column of the type null
  Given an ES|QL rule with the query FROM logs | EVAL risk = NULL
  And an exception item on the output columns with the entry risk is low
  When the rule runs
  Then the item is not applied with the code field_not_found
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: An entry with an exclusive operator on a column that the query does not output is left out of the item

**Priority:** P1

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/resolve_end_stage_items.test.ts`: "leaves out an entry with an exclusive operator on a column that the query does not output, because it is true for every row"; `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "applies an item with an entry that has an exclusive operator on a column that the query does not output, without that entry"), partial: the unit tests use "is not" only and mocked clients.
```gherkin
Scenario Outline: The entry with an exclusive operator is true for every row
  Given an ES|QL rule with STATS failures = COUNT(*) BY user.name
  And an exception item on the output columns with the entries failures is 3 and missing.field <operator> (with the value x when the operator takes one)
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

Scenario: The entry with an exclusive operator does not hide an entry with an inclusive operator on another column that the query does not output
  Given an exception item on the output columns with the entries failures is 3, missing.field is not x and other.missing is y
  When the rule runs
  Then no alert is excluded by that item
  And the rule execution log records the item as not applied with the code field_not_found for other.missing
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: An item whose entries all have an exclusive operator on columns that the query does not output excludes every row and warns the rule

**Priority:** P1

**Automation coverage**: 9 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/resolve_end_stage_items.test.ts`: "excludes every row for an item whose entries all have an exclusive operator on columns that the query does not output, as the DSL filter does for a field that exists nowhere", "does the same when there are several entries with an exclusive operator, and not when one of them has an inclusive operator", "still skips an item that has no entries at all, which the API does not accept"; `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "writes a stage that keeps no row for an item whose entries all have an exclusive operator on columns that the query does not output", "joins that stage with the stage of the other items", "warns that the rule creates no alerts, and names the item and its list", "has one warning for all the items, and names the first 5", "has no warning for an item that is applied normally, skipped, or an item with an entry that has an exclusive operator and another entry"; `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/esql.test.ts`: "exceptions at the end of the query › warns on the rule that it creates no alerts when an exception is true for every row, and writes a stage that keeps no row"), partial: the unit tests cover the resolution and the query, not a running rule. This scenario was also run on a local stack.
```gherkin
Given an ES|QL rule with STATS failures = COUNT(*) BY user.name
And an exception item on the output columns with the only entry missing.field is not x
When the rule runs
Then the final query ends with a WHERE stage that keeps no row
And no alert is created
And the rule shows one warning, with the status partial failure, that names the item and says that the rule creates no alerts because exceptions exclude every row
And the rule execution log lists the item as applied at the end of the query

Given an exception item on the output columns with the entries missing.field is not x and other.missing does not exist
When the rule runs
Then the result is the same, with one warning

Given an exception item on the output columns with the entries missing.field is not x and other.missing is y
When the rule runs
Then the item is skipped with the code field_not_found, because the entry with an inclusive operator can never match
And alerts are created for every row
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A column type that cannot be tested is refused when the item is saved, and a query that outputs one fails the rule

**Priority:** P1

**Automation coverage**: 1 unit test (`x-pack/solutions/security/packages/kbn-securitysolution-exceptions-common/api/applies_to.test.ts`: "rejects %s" (parameterized: an applies_to that does not exist, a column_type that does not exist), 2 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "items › does not compile a column of type %s", "items › does not compile an entry that does not declare the type of its column" (the first one is parameterized)) for an item that is stored without the API validation, 1 unit test (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/resolve_end_stage_items.test.ts`: "reports an entry that declares another type than the column has, and does not write the item"), partial: the unit tests cover the schema, the compiler and the resolution, not a running rule.
```gherkin
Scenario Outline: Exception on an unsupported column
  Given an ES|QL rule whose output has a column of type <type>
  And an exception item on the output columns with the entry that column is <value> and the column type <type>
  When the user saves the item
  Then the API refuses it because <type> is not one of the column types that an entry can declare

  Examples:
    | type            | value        |
    | geo_point       | 41.12,-71.34 |
    | cartesian_point | 1.0,2.0      |

Scenario: A query that outputs a column of a type that cannot be declared
  Given an ES|QL rule whose query outputs a geo_point column named loc
  And an exception item on the output columns with the entry loc exists and the column type keyword
  When the rule runs
  Then the rule fails as a user error before the query runs
  And the message says that the item declares the column "loc" as keyword and that the query outputs it as geo_point
  And no alerts are created

Scenario: An entry with no column type that is stored without the API validation
  Given an exception item on the output columns with the entry risk is low and no column_type
  When the rule runs
  Then the rule fails as a user error before the query runs
  And the message starts with "The rule did not run because exception items have a value or a column type that cannot be used at the end of the query"
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: "matches" on a column that is not a string is refused when the item is saved

**Priority:** P1

**Automation coverage**: 1 unit test (`x-pack/solutions/security/plugins/lists/server/services/exception_lists/applies_to.test.ts`: "rejects a value that does not fit its column_type, and an operation that the type does not support"), 1 unit test (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "does not compile \"matches\" on a column that is not a string") for an item that is stored without the API validation, partial: the unit tests cover the refusal and the compiler, not the rule execution log.
```gherkin
Given an ES|QL rule whose output has a long column named count
And an exception item on the output columns with the entry count matches 4* and the column type long
When the user saves the item
Then the API refuses it because an entry of type wildcard is not supported on a column of type long

Given the same item stored without the API validation
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

#### Scenario: A value list or nested entry on an item on the output columns is refused when the item is saved

**Priority:** P1

**Automation coverage**: 1 unit test (`x-pack/solutions/security/plugins/lists/server/services/exception_lists/applies_to.test.ts`: "rejects an item with os_types, a value list and a nested entry"), 1 API integration test (`x-pack/solutions/security/test/security_solution_api_integration/test_suites/lists_and_exception_lists/exception_lists_items/trial_license_complete_tier/items/applies_to_exception_list_items.ts`: "items that apply to the ES|QL output columns › reject os_types, value lists and nested entries"), 1 unit test (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "items › does not compile %s entries" (parameterized over list and nested)) for an item that is stored without the API validation, partial: the unit tests cover the refusal and the compiler, not the rule execution log.
```gherkin
Given an ES|QL rule whose query adds a tier column with EVAL
And an exception item on the output columns with an entry that uses a value list on the tier column
When the user saves the item
Then the API refuses it because the entry has the type "list"

Given an exception item on the output columns with a nested entry on the tier column
When the user saves the item
Then the API refuses it because the entry has the type "nested"

Given the item with the value list stored without the API validation
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
And an exception item on the output columns with 200 comparisons on the column c
When the rule runs on a cluster whose clause limit is low
Then the rule fails as a user error
And the message says that the WHERE expressions of the rule query and the exceptions on the output columns are counted together
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

#### Scenario: An item with os_types is refused when it applies to the output columns, and a source item keeps its os_types in the DSL filter

**Priority:** P1

**Automation coverage**: 1 unit test (`x-pack/solutions/security/plugins/lists/server/services/exception_lists/applies_to.test.ts`: "rejects an item with os_types, a value list and a nested entry"), 2 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/build_end_stage_clause.test.ts`: "items with os_types › does not apply an item that is restricted to operating systems, which only the DSL filter applies", "items with os_types › applies an item with an empty os_types") for an item that is stored without the API validation, partial: the unit tests cover the refusal and the compiler, not a running rule.
```gherkin
Given an ES|QL rule whose query adds a computed column
And an exception item on the output columns with os_types windows and an entry on that column
When the user saves the item
Then the API refuses it because it cannot have os_types

Given the same item stored without the API validation
When the rule runs
Then the item is not applied and the log records the code os_types_not_supported
And alerts are still created for every row

Given an exception item on the source documents with os_types windows and an entry on a source field
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
<summary><strong>Failure handling</strong>: 4 scenarios (P0: 2, P1: 2, P2: 0)</summary>

#### Scenario: A rule with no items on the output columns sends no probe request

**Priority:** P1

**Automation coverage**: 4 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/esql.test.ts`: "exceptions at the end of the query › does not read the output columns when the rule %s", "exceptions at the end of the query › does not read the fields of the source indices, because the items say what they apply to", "exceptions at the end of the query › traces the whole request when no exception was added to the query" (the first one is parameterized: no exceptions on the output columns, only an expired exception on the output columns); `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "does nothing, and sends no request, when there are no exception items"), partial: the unit tests check that no request is made, not the alerts.
```gherkin
Scenario Outline: Requests that the exceptions add to a run
  Given an ES|QL rule with <exceptions>
  When the rule runs
  Then alerts are created for every row that the exceptions do not exclude
  And the rule sends <requests> besides the query
  And no request reads the fields of the source indices
  And the trace log of the executor holds the whole request, as it does today, when no item is added to the query

  Examples:
    | exceptions                                              | requests                                        |
    | no exception lists                                      | no request                                      |
    | only items on the source documents                      | no request                                      |
    | only an item on the output columns that expired         | no request                                      |
    | one item on the output columns                          | one probe: the query followed by LIMIT 0        |
    | three items on the output columns in two lists          | one probe                                       |
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: If the output columns cannot be read, the rule fails

**Priority:** P0

**Automation coverage**: 4 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "when the output columns cannot be read › throws before the query runs, and names the reason", "when the output columns cannot be read › does not write to the rule execution log"; `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/esql.test.ts`: "exceptions at the end of the query › fails the rule, without running the query, when the output columns cannot be read", "exceptions at the end of the query › keeps the user error classification of the failed request"), partial: the unit tests use mocked Elasticsearch clients.
```gherkin
Given an ES|QL rule with an exception item on the output columns
And the probe request fails during the rule run
When the rule runs
Then the rule status is failed before the query runs
And the message starts with "The rule did not run because the output columns of its query could not be read to apply its exceptions on them:" and ends with the reason of the failed request
And no alerts are created
And the failure is a user error only when the failed request is one (for example a missing privilege)
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: A declared column type that is not the type that the query outputs fails the rule

**Priority:** P0

**Automation coverage**: 9 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/resolve_end_stage_items.test.ts`: "reports an entry that declares another type than the column has, and does not write the item", "reports each entry with a mismatch", "keeps writing the other items when one has a mismatch or is skipped"; `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/column_type_mismatch_error.test.ts`: "names the item, its list, the column and both types", "names the first 5 mismatches and counts the others"; `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "columns that the query outputs with another type than the item declares › throws before the query runs, and names the item, the column and both types", "columns that the query outputs with another type than the item declares › names every item that has a mismatch, and none of the others", "columns that the query outputs with another type than the item declares › does not report it as an inspection failure"; `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/esql.test.ts`: "exceptions at the end of the query › fails the rule as a user error, without running the query, when the query outputs a column with another type than the item declares"), partial: the unit tests use mocked Elasticsearch clients, not a running rule.
```gherkin
Scenario Outline: The declared type is not the type of the column
  Given an ES|QL rule whose query outputs a column named count of type long
  And an exception item on the output columns with the entry count is 3 and the column type <declared>
  When the rule runs
  Then <result>

  Examples:
    | declared | result                                                                              |
    | keyword  | the rule fails before the query runs, with the message below                        |
    | integer  | the rule fails before the query runs, with the message below                        |
    | long     | the item is applied and the row with count 3 is excluded                            |

Scenario: The message of the failure
  Given the rule of the first scenario with the declared type keyword
  When the rule runs
  Then the rule status is failed as a user error
  And the message starts with "The rule did not run because exception items declare a column type that is not the type that the query outputs:"
  And the message names the item, its list and its id, the column, the declared type and the type that the query outputs, as in "declares the column "count" as keyword, and the query outputs it as long"
  And the message ends with "Fix the type in these exception items, or remove them from this rule."
  And no alerts are created
  And the failure is not reported as a failure to read the output columns

Scenario: More than 5 items with a mismatch
  Given 7 exception items on the output columns that declare a type that the query does not output
  When the rule runs
  Then the message names the first 5 items and then says "and 2 more"
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

#### Scenario: The probe of the output columns sends the filter of the real request

**Priority:** P1

**Automation coverage**: 3 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/apply_end_stage_exceptions.test.ts`: "sends the filter of the real request with the probe, so that it resolves the same indices"; `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/esql.test.ts`: "exceptions at the end of the query › sends the filter of the request with the probe of the output columns", "exceptions at the end of the query › sends the data tier filter and the exception filter with the probe, as the real request does"), partial: the unit tests use mocked clients.
```gherkin
Given two indices of the rule where the field f is a keyword in an old index and a long in the index inside the time range
And an ES|QL rule over both indices with an exception item on the output columns for a column computed from f
When the rule runs
Then the rule succeeds
And the exception is applied at the end of the query
And the probe carries the exception filter that is built from the source items, as the real request does
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
Given an ES|QL rule with one exception item on the source documents and one on the output columns
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
Given an ES|QL rule with a source item new.field is x, on a field that is not in the source indices
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

#### Scenario: Editing the rule query to rename a column or to change its type changes what its exception does

**Priority:** P2

**Automation coverage**: 2 unit tests (`x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/resolve_end_stage_items.test.ts`: "skips an item with an entry that has an inclusive operator on a column that the query does not output, because it never matches", "reports an entry that declares another type than the column has, and does not write the item"), partial: the unit tests cover the resolution against the output columns, not a rule that is edited between runs.
```gherkin
Given an ES|QL rule with an exception item on the output columns for the column target_host, of type keyword
When the user edits the query so that the column is named dest_host and the rule runs
Then the item is not applied, and the rule execution log records the code field_not_found
And no warning is shown on the rule
And no alert is excluded by that item

Given the user edits the query again so that target_host is a long
When the rule runs
Then the rule fails as a user error before the query runs
And the message says that the item declares the column "target_host" as keyword and that the query outputs it as long
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
Given an ES|QL rule with FROM remote_cluster:logs-* and exception items on the source documents and on the output columns
When the rule runs
Then both items exclude their rows
And the probe of the output columns does not fail because of the remote index
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply to this comment with details (env, build, repro steps)._

</details>

---

## Test Coverage Summary

**Total scenarios:** 90

| Feature area | Scenarios | P0 | P1 | P2 | Automated | Manual only |
|---|---|---|---|---|---|---|
| Exceptions on source fields keep working | 24 | 10 | 12 | 2 | 17 | 7 |
| Exceptions on computed columns | 42 | 8 | 24 | 10 | 33 | 9 |
| Items that are not applied or refused, and how they are reported | 14 | 1 | 9 | 4 | 14 | 0 |
| Failure handling | 4 | 2 | 2 | 0 | 4 | 0 |
| Dependency data lifecycle | 4 | 0 | 2 | 2 | 1 | 3 |
| Spaces and cross-cluster search (to confirm) | 2 | 0 | 0 | 2 | 0 | 2 |
| **Total** | **90** | **21** | **49** | **20** | **69** | **21** |

**Automated coverage notes:**
- The Automated column counts scenarios with at least one matching unit or API integration test. Almost all of them are partial: the tests check the generated clause, the compiler, the resolution of the items against the output columns or the split of the items by `applies_to` with mocked clients, not the alerts of a running rule. Only the "is" operator on one source field, and one exception on a column that the query computes with alert suppression, have an API integration test that runs a rule.
- Unit tests (Jest) for the DSL filter builder in `x-pack/solutions/security/plugins/lists/server/services/exception_lists/build_exception_filter.test.ts`: they cover the DSL clause per entry type, not the result of an ES|QL rule.
- Unit tests (Jest) for the new code in `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/end_stage_exceptions/` (`build_end_stage_clause.test.ts`, `resolve_end_stage_items.test.ts`, `column_type_mismatch_error.test.ts`, `apply_end_stage_exceptions.test.ts`, `invalid_exception_values_error.test.ts`, `build_exceptions_log_entry.test.ts`), in `esql.test.ts` ("exceptions at the end of the query") and in `utils/get_exception_items_for_rule.test.ts`: they cover the compiler, the resolution of the items against the output columns, the split of the items by `applies_to`, the orchestration and the wiring with mocked Elasticsearch clients. The write-time validation has its own tests: `x-pack/solutions/security/plugins/lists/server/services/exception_lists/applies_to.test.ts`, `x-pack/solutions/security/packages/kbn-securitysolution-exceptions-common/api/applies_to.test.ts` and the API integration tests in `x-pack/solutions/security/test/security_solution_api_integration/test_suites/lists_and_exception_lists/exception_lists_items/trial_license_complete_tier/items/applies_to_exception_list_items.ts`. The scenarios that name them cover the refusal when the item is saved, not what the rule does.
- API integration tests in `x-pack/solutions/security/test/security_solution_api_integration/test_suites/detections_response/detection_engine/rule_execution_logic/esql/trial_license_complete_tier/`: `esql.ts` and `esql_suppression.ts` each have one "with exceptions › should apply exceptions" test with an "is" entry on `client.ip`. `esql_suppression.ts` also has one test for an exception on a column that the query computes ("with exceptions › on a column that the query computes"), which creates its item with `applies_to: esql_output_columns` and a `column_type`. These tests are written but have not been run yet.
- Four scripts at the root of the repository run against a live stack. `esql_exceptions_try_matrix.mjs` runs `esql_exceptions_try.mjs` for 3,832 combinations of exception kind, field type, operator and invalid value (one item, two items, and lists of two or three exceptions), and every run ended as the script predicts. `esql_exceptions_suppression.mjs` runs a rule with alert suppression and two exceptions (one on a computed column, one on a source field), and then a second run over a 30-minute suppression window, and compares the suppressed document counts of the alerts with what it expects. `esql_exceptions_smoke.mjs` creates lists with several exceptions, each with several items, one target document per exception and one document that no exception excludes, runs the rule through Kibana, and compares the alerts with what it expects. `esql_exceptions_try.mjs` is interactive: you describe an exception (where its field lives, its type, its operator, and whether its value is invalid), and it creates the rule, runs it and compares the alerts and the rule execution log with the expected placement. Two earlier runs, which are not in the repository, excluded the expected rows for 27 operator and type cases against Elasticsearch, and compared `is`, `matches` and their negatives on a computed `text` column with the same exceptions on a `keyword` field, through real rules in Kibana.
- Not covered: no Scout or Cypress test exercises exceptions on the output columns, and the only API integration test that does (the one on alert suppression) has not been run. No automated test checks, with a running rule, the log message of skipped items, the probe request or the regression matrix of operators and field types for ES|QL rules. Every scenario marked "No existing tests found" needs manual execution or a new automated test.

## Test Execution Notes

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
- "is not" on a field that exists nowhere excludes every document
- An exception on a STATS output column excludes only the matching alert rows
- An exception on a renamed column excludes only that row and leaves the other rows unchanged
- An exception on an EVAL column excludes the rows with that value
- "is not" on a computed column excludes the rows with another value and the rows without a value
- "is one of" on a computed column excludes the rows that hold any of the values
- "is" on a text computed column excludes the rows by the whole value and respecting case, as on a keyword column
- A shared list with source items and output-column items applies each item in the right place, and a query rule drops the output-column items
- Placement follows applies_to: a source item and an item on the output columns with the same name test different values
- A value that does not fit the column type is refused when the item is saved, and fails the rule if it is stored without the API validation
- If the output columns cannot be read, the rule fails
- A declared column type that is not the type that the query outputs fails the rule

**P1: run before release, high-impact regressions:**
- "is not one of" excludes the documents that hold none of the values
- "does not match" excludes the documents whose value does not fit the pattern
- "does not exist" excludes the documents that lack the field
- A multi-valued field is excluded when any one of its values matches
- A date value excludes the unit that it names, and only the first day for a month or year value
- A nested entry excludes a document only when one nested object satisfies every inner entry
- A value list that cannot be processed is reported on the rule and the other exceptions still apply
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
- An item with several entries on computed columns combines them with AND, including an entry with an exclusive operator
- An item on the output columns tests every entry on the columns of the output, including one named like a source field
- The exception stage works when the query ends with SORT and LIMIT
- A LIMIT in the rule query applies before an exception on a computed column and the rule can return fewer alerts than the LIMIT
- An exception on a source field applies before the LIMIT and the rule still returns as many alerts as the LIMIT
- A rule with more rows than the maximum alerts still creates the allowed number of alerts after the exceptions
- A row with no value in the computed column is kept by "is"
- Many exception items are joined with AND in one WHERE stage
- A CIDR value on a computed ip column excludes every address in the range, including multi-valued columns
- An exception on a computed column excludes rows before alert suppression: they create no alert and are not counted as suppressed
- A rule with alert suppression over a time window applies the exception on every run
- An exception on a double column applies for "exists" only
- A nested exception stays in the DSL filter, even when the query creates a column named like its path
- More than 200 comparisons fail the rule, name the limit and the largest items
- A text column is compared the same after STATS, LIMIT and MV_EXPAND
- "matches" and "does not match" on a text computed column compare the whole value and respect case, as on a keyword column
- A value that the DSL filter accepts and the compiler does not write is refused when the item is saved, and fails the rule if it is stored without the API validation
- An item with an entry that has an inclusive operator on a column that the query does not output is not applied and creates no warning
- An entry with an exclusive operator on a column that the query does not output is left out of the item
- An item whose entries all have an exclusive operator on columns that the query does not output excludes every row and warns the rule
- A column type that cannot be tested is refused when the item is saved, and a query that outputs one fails the rule
- "matches" on a column that is not a string is refused when the item is saved
- A value list or nested entry on an item on the output columns is refused when the item is saved
- The rule execution log has one JSON message with the final query, the applied items and the items that are not applied
- An item with os_types is refused when it applies to the output columns, and a source item keeps its os_types in the DSL filter
- A rule with no items on the output columns sends no probe request
- The probe of the output columns sends the filter of the real request
- A deleted exception item stops excluding on the next run, in both positions
- An edited exception value applies on the next run

**P2: run as capacity allows, limited blast radius:**
- A field mapped with different types in two indices is matched per index by the DSL filter
- Exceptions apply on a rule that uses alert suppression
- A date value on a computed date_nanos column excludes the unit that it names
- A multi-valued computed column is excluded when any value matches
- A column name with a hyphen or a dot can be used in an exception
- An aggregating rule with alert suppression applies the exception to the aggregated rows
- A column named with a reserved word is quoted
- A comment at the end of the rule query does not swallow the exception stages
- After MV_EXPAND, an exception on a computed column excludes the row and an exception on the source field excludes the document
- A keyword field with a normalizer differs between the DSL filter and a computed column
- A date format that the compiler does not write is refused when the item is saved, and fails the rule if it is stored without the API validation
- A text source field and a computed text column can exclude different documents for the same exception
- Splitting an item into several items does not change the count of comparisons
- A rule query with many WHERE conditions of its own shares the clause budget with the exceptions
- An "is one of" list is written as one call, whatever its length
- Items that would make the query longer than 1,000,000 characters fail the rule and name the limit
- A field that is mapped later changes what its item matches, and the item stays in the DSL filter
- Editing the rule query to rename a column or to change its type changes what its exception does
- Exceptions on a computed column apply for a rule in a non-default space
- Exceptions apply for a rule that reads a remote cluster

---

<details>
<summary>📊 Issue Clarity Assessment</summary>

Not applicable: no GitHub issue was used. The plan was derived from `esql_exceptions_proposal.md`, `esql_exceptions_v1_inventory.md` and the implementation on the branch `esql-end-stage-exceptions`. Create an issue for the work and regenerate the plan with the `test-plan-generator` skill if a scored assessment is needed. ⚠️

</details>

---

*🤖 Generated by claude-sonnet-5-5 on 2026-10-02*
