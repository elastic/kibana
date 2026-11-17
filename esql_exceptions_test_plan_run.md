# Run of the test plan against the local stack

Stack: Elasticsearch 9.6.0-SNAPSHOT (trial) and Kibana 9.6.0 from this worktree, branch `esql-end-stage-exceptions`, run on 2026-11-05. The scenarios ran through rule preview, except 54, 75 and the log checks, which used real scheduled rules and read the event log. The scenario code is not in the repository.

Result: 82 PASS, 7 PASS for the API checks with the stored-without-validation step not run, 1 BLOCKED (90).

| # | Scenario | Result | Notes |
|---|---|---|---|
| 1 | "is" excludes the documents that hold the value, for each supported field type | PASS |  |
| 2 | "is not" excludes the documents that do not hold the value, including those without the field | PASS |  |
| 3 | "is one of" excludes the documents that hold any of the values | PASS |  |
| 4 | "matches" excludes the documents whose value fits the pattern on keyword and text fields | PASS |  |
| 5 | "exists" excludes the documents that have the field | PASS |  |
| 6 | The entries of one item are combined with AND | PASS |  |
| 7 | The items of a list are combined with OR | PASS |  |
| 8 | A value list excludes the documents whose value is in the list | PASS |  |
| 9 | An exception on a source field changes the aggregates of an aggregating rule | PASS |  |
| 10 | "is not one of" excludes the documents that hold none of the values | PASS |  |
| 11 | "does not match" excludes the documents whose value does not fit the pattern | PASS |  |
| 12 | "does not exist" excludes the documents that lack the field | PASS |  |
| 13 | A multi-valued field is excluded when any one of its values matches | PASS |  |
| 14 | A date value excludes the unit that it names, and only the first day for a month or year value | PASS |  |
| 15 | A nested entry excludes a document only when one nested object satisfies every inner entry | PASS |  |
| 16 | A value list that cannot be processed is reported on the rule and the other exceptions still apply | PASS | warning on the rule: "The following exceptions won't be applied to rule execution: item 0" |
| 17 | "is not" on a field that exists nowhere excludes every document | PASS |  |
| 18 | A field type that Elasticsearch rejects fails the rule and creates no alert | PASS |  |
| 19 | The rule keeps creating alerts from the documents that the exceptions do not exclude when many documents are excluded | PASS |  |
| 20 | An expired exception item is not applied | PASS |  |
| 21 | Items of the rule's own list and of a shared list both apply | PASS |  |
| 22 | A rule preview applies the exceptions | PASS |  |
| 23 | A field mapped with different types in two indices is matched per index by the DSL filter | PASS | errors=[] |
| 24 | Exceptions apply on a rule that uses alert suppression | PASS |  |
| 25 | An exception on a STATS output column excludes only the matching alert rows | PASS |  |
| 26 | An exception on a renamed column excludes only that row and leaves the other rows unchanged | PASS |  |
| 27 | An exception on an EVAL column excludes the rows with that value | PASS |  |
| 28 | "is not" on a computed column excludes the rows with another value and the rows without a value | PASS |  |
| 29 | "is one of" on a computed column excludes the rows that hold any of the values | PASS |  |
| 30 | "is" on a text computed column excludes the rows by the whole value and respecting case, as on a keyword column | PASS |  |
| 31 | A shared list with source items and output-column items applies each item in the right place, and a query rule drops the output-column items | PASS |  |
| 32 | "is not one of" on a computed column excludes the rows that hold none of the values | PASS |  |
| 33 | "matches" on a keyword computed column excludes the rows whose whole value fits the pattern | PASS |  |
| 34 | "does not match" on a keyword computed column excludes the rows whose value does not fit the pattern | PASS |  |
| 35 | "exists" on a computed column excludes the rows that have a value | PASS |  |
| 36 | "does not exist" on a computed column excludes the rows that are empty | PASS |  |
| 37 | "is" works on each supported computed column type | PASS |  |
| 38 | A date value on a computed date column excludes the unit that it names | PASS |  |
| 39 | "is one of", "is not" and "is not one of" on a text computed column behave as on a keyword column for multi-valued, missing and mixed-case values | PASS |  |
| 40 | An item with several entries on computed columns combines them with AND, including an entry with an exclusive operator | PASS |  |
| 41 | An item on the output columns tests every entry on the columns of the output, including one named like a source field | PASS |  |
| 42 | The exception stage works when the query ends with SORT and LIMIT | PASS |  |
| 43 | A LIMIT in the rule query applies before an exception on a computed column and the rule can return fewer alerts than the LIMIT | PASS |  |
| 44 | An exception on a source field applies before the LIMIT and the rule still returns as many alerts as the LIMIT | PASS |  |
| 45 | A rule with more rows than the maximum alerts still creates the allowed number of alerts after the exceptions | PASS |  |
| 46 | A row with no value in the computed column is kept by "is" | PASS |  |
| 47 | Many exception items are joined with AND in one WHERE stage | PASS |  |
| 48 | A CIDR value on a computed ip column excludes every address in the range, including multi-valued columns | PASS |  |
| 49 | A date value on a computed date_nanos column excludes the unit that it names | PASS |  |
| 50 | A multi-valued computed column is excluded when any value matches | PASS |  |
| 51 | A column name with a hyphen or a dot can be used in an exception | PASS |  |
| 52 | An aggregating rule with alert suppression applies the exception to the aggregated rows | PASS |  |
| 53 | An exception on a computed column excludes rows before alert suppression: they create no alert and are not counted as suppressed | PASS |  |
| 54 | A rule with alert suppression over a time window applies the exception on every run | PASS | real scheduled rule (1 minute), data added between two runs, run on the stack |
| 55 | An exception on a double column applies for "exists" only | PASS |  |
| 56 | Placement follows applies_to: a source item and an item on the output columns with the same name test different values | PASS |  |
| 57 | A nested exception stays in the DSL filter, even when the query creates a column named like its path | PASS |  |
| 58 | A column named with a reserved word is quoted | PASS |  |
| 59 | A comment at the end of the rule query does not swallow the exception stages | PASS |  |
| 60 | After MV_EXPAND, an exception on a computed column excludes the row and an exception on the source field excludes the document | PASS |  |
| 61 | A keyword field with a normalizer differs between the DSL filter and a computed column | PASS |  |
| 62 | A date format that the compiler does not write is refused when the item is saved, and fails the rule if it is stored without the API validation | PASS (API checks); stored step BLOCKED | stored-without-validation step not run: the .kibana_security_solution index is restricted, even for the superuser |
| 63 | More than 200 comparisons fail the rule, name the limit and the largest items | PASS |  |
| 64 | A text column is compared the same after STATS, LIMIT and MV_EXPAND | PASS |  |
| 65 | "matches" and "does not match" on a text computed column compare the whole value and respect case, as on a keyword column | PASS | the plan expects "*good.com*" to exclude only "good.com", but whole-value matching also excludes "Connection to good.com failed"; the run confirms the latter |
| 66 | A text source field and a computed text column can exclude different documents for the same exception | PASS |  |
| 67 | A value that does not fit the column type is refused when the item is saved, and fails the rule if it is stored without the API validation | PASS (API checks); stored step BLOCKED | stored-without-validation step not run: the .kibana_security_solution index is restricted, even for the superuser |
| 68 | A value that the DSL filter accepts and the compiler does not write is refused when the item is saved, and fails the rule if it is stored without the API validation | PASS (API checks); stored step BLOCKED | stored-without-validation step not run: the .kibana_security_solution index is restricted, even for the superuser |
| 69 | An item with an entry that has an inclusive operator on a column that the query does not output is not applied and creates no warning | PASS |  |
| 70 | An entry with an exclusive operator on a column that the query does not output is left out of the item | PASS |  |
| 71 | An item whose entries all have an exclusive operator on columns that the query does not output excludes every row and warns the rule | PASS | rerun after the behavior changed: every row is excluded and the rule shows a warning (status partial failure), also checked with a real scheduled rule |
| 72 | A column type that cannot be tested is refused when the item is saved, and a query that outputs one fails the rule | PASS (API checks); stored step BLOCKED | stored-without-validation step not run: the .kibana_security_solution index is restricted, even for the superuser |
| 73 | "matches" on a column that is not a string is refused when the item is saved | PASS (API checks); stored step BLOCKED | stored-without-validation step not run: the .kibana_security_solution index is restricted, even for the superuser |
| 74 | A value list or nested entry on an item on the output columns is refused when the item is saved | PASS (API checks); stored step BLOCKED | stored-without-validation step not run: the .kibana_security_solution index is restricted, even for the superuser |
| 75 | The rule execution log has one JSON message with the final query, the applied items and the items that are not applied | PASS | real scheduled rule, event log read |
| 76 | Splitting an item into several items does not change the count of comparisons | PASS |  |
| 77 | A rule query with many WHERE conditions of its own shares the clause budget with the exceptions | PASS | last stage of 39: fails alone, too big; last stage of 38: fails alone, too big; last stage of 36: fails alone, too big; last stage of 34: fails alone, too big; last stage of 32: alone ok; with 200 comparisons on the renamed column: fails |
| 78 | An "is one of" list is written as one call, whatever its length | PASS |  |
| 79 | Items that would make the query longer than 1,000,000 characters fail the rule and name the limit | PASS |  |
| 80 | An item with os_types is refused when it applies to the output columns, and a source item keeps its os_types in the DSL filter | PASS (API checks); stored step BLOCKED | stored-without-validation step not run: the .kibana_security_solution index is restricted, even for the superuser |
| 81 | A rule with no items on the output columns sends no probe request | PASS | probe presence checked through the error message of an invalid query; the single probe for several items was checked with the ES/QL query counter |
| 82 | If the output columns cannot be read, the rule fails | PASS | an invalid query makes the probe fail first; a probe that fails while the real query succeeds was not caused |
| 83 | A declared column type that is not the type that the query outputs fails the rule | PASS |  |
| 84 | The probe of the output columns sends the filter of the real request | PASS |  |
| 85 | A deleted exception item stops excluding on the next run, in both positions | PASS |  |
| 86 | An edited exception value applies on the next run | PASS |  |
| 87 | A field that is mapped later changes what its item matches, and the item stays in the DSL filter | PASS |  |
| 88 | Editing the rule query to rename a column or to change its type changes what its exception does | PASS |  |
| 89 | Exceptions on a computed column apply for a rule in a non-default space | PASS |  |
| 90 | Exceptions apply for a rule that reads a remote cluster | BLOCKED | no remote cluster on this stack |
