# Demo: exceptions on computed columns in ES|QL rules

Everything below is already created on the stack at `localhost:5601` (Elasticsearch on `localhost:9201`, Default space) by `esql_exceptions_demo.mjs`. Every case was run once and matches the expected results in this file.

## Before recording

| What | Command |
|---|---|
| Write the documents again with new timestamps (the rules read the last 2 hours, and the documents are from the last 30 minutes) | `node esql_exceptions_demo.mjs --refresh-data` |
| Create everything again from zero (removes the old rules, alerts, lists and indices first) | `node esql_exceptions_demo.mjs` |
| Remove everything | `node esql_exceptions_demo.mjs --clean` |

Use Node 24.22.3 (the one in `.nvmrc`).

- Each rule runs once, and the script disables it when the result is what the plan expects. The rules are disabled while you record, so nothing runs again. A rule that does not show the expected result stays enabled, and the script says so.
- The script set the advanced setting `securitySolution:extendedRuleExecutionLoggingMinLevel` to `info` (it was unset). Without it the log message of the exceptions is not written. To reset it after the video, run:

```bash
curl -s -X POST -u elastic:changeme -H 'kbn-xsrf: x' -H 'x-elastic-internal-origin: kibana' -H 'elastic-api-version: 1' -H 'Content-Type: application/json' localhost:5601/kbn/internal/kibana/settings -d '{"changes":{"securitySolution:extendedRuleExecutionLoggingMinLevel":null}}'
```

## The screens

| Segment | Where | URL |
|---|---|---|
| The exceptions | Rules > Shared Exception Lists | `http://localhost:5601/kbn/app/security/exceptions` |
| How the rule ran | Rules > open the rule > Execution results tab | `http://localhost:5601/kbn/app/security/rules` (filter by `Demo:`, the rule names are `Case 1. Demo: ...` to `Case 6. Demo: ...`) |
| What was executed, and the alerts | Discover, ES|QL mode | `http://localhost:5601/kbn/app/discover` |

## The Discover queries

Paste each one in the ES|QL editor of Discover. I ran them through the `_query` API of Elasticsearch, and I did not drive the Discover editor itself.

**1. What was executed.** One row for each rule that applied or skipped exceptions. It shows the final query that Elasticsearch ran, the exceptions applied at the end of the query and the ones that were not applied, with the reason.

```
FROM .kibana-event-log-*
| WHERE event.provider == "securitySolution.ruleExecution" AND message LIKE "*esql_exceptions*"
| EVAL final_query = JSON_EXTRACT(message, "$.query"),
       applied = JSON_EXTRACT(message, "$.appliedAtEndOfQuery"),
       not_applied = JSON_EXTRACT(message, "$.notApplied")
| KEEP @timestamp, rule.name, applied, not_applied, final_query
| SORT @timestamp DESC
```

Open the `final_query` column of a row to read the query. The last line is the stage that the exceptions became.

**2. How the rule ran.** The status and the message of each run. This is where the failures of cases 4 and 5 appear, because those rules stop before the query runs and write no message for query 1. The warning of case 6 appears here too.

```
FROM .kibana-event-log-*
| WHERE event.provider == "securitySolution.ruleExecution" AND event.action == "status-change" AND rule.name LIKE "Case*"
| KEEP @timestamp, rule.name, kibana.alert.rule.execution.status, message
| SORT @timestamp DESC
```

**3. The alerts that survived.** The alerts store the computed columns in their source, but the alerts index does not map them, so the query needs the first line to read them.

```
SET unmapped_fields="load";
FROM .alerts-security.alerts-default
| WHERE kibana.alert.rule.name LIKE "Case*"
| KEEP kibana.alert.rule.name, Esql.source_network, Esql.failed_count, host.name, Esql.destination_domain, Esql.total_bytes
| SORT kibana.alert.rule.name, Esql.source_network, host.name
```

**4. The rows before the exceptions** (what the rule query returns on its own, to compare with the alerts). One query for each rule query.

```
FROM demo-auth
| WHERE event.outcome == "failure"
| EVAL Esql.source_network = IP_PREFIX(source.ip, 24, 0)
| STATS Esql.failed_count = COUNT(*) BY Esql.source_network
| WHERE Esql.failed_count >= 20
| SORT Esql.source_network
```

```
FROM demo-network
| STATS Esql.total_bytes = SUM(network.bytes) BY host.name, Esql.destination_domain = destination.domain
| WHERE Esql.total_bytes >= 500000000
| SORT host.name
```

## The cases

### Case 1. Demo: Many failed logins from one network

The rule `Case 1. Demo: Many failed logins from one network` alerts when a network (the `/24` of the source address) has 20 or more failed logins. The network is computed in the query.

- **Exceptions** (list "Demo case 1: Corporate VPN and partner scanners"). Both cards show the badge "Computed columns", in Shared Exception Lists and in the Rule exceptions tab of the rule. Case 2 has one card without the badge (the source item) and one with it:
  - "Corporate VPN exit": `Esql.source_network` `is` `10.20.0.0/16`.
  - "Partner scanners": `Esql.source_network` `is one of` `198.51.100.0` and `198.18.0.0`.
- **Rows before the exceptions** (query 4): 6 networks: `10.20.1.0` (34), `10.20.2.0` (28), `100.64.7.0` (22), `192.0.2.0` (25), `198.51.100.0` (41), `203.0.113.0` (57).
- **How the rule ran:** succeeded, 3 alerts.
- **What was executed** (query 1): both items applied at the end of the query. The last line of the query is:

```
| WHERE (NOT (MV_INTERSECTS(Esql.source_network, TO_IP(["198.51.100.0", "198.18.0.0"])))) AND (NOT (COALESCE(MV_IN_RANGE(Esql.source_network, "10.20.0.0"::ip, "10.20.255.255"::ip), false)))
```

- **Alerts** (query 3): `100.64.7.0`, `192.0.2.0` and `203.0.113.0`. The VPN networks and the scanner are gone.
- **Say:** the CIDR range and the list became one `WHERE` stage on the computed column, and the same exceptions are in the list that the user edits in the UI.

### Case 2. Demo: Large outbound transfer per host

The rule alerts when a host sends 500 MB or more to one destination. The destination is renamed in the query, and the total is computed.

- **Exceptions** (list "Demo case 2: Backup server and internal destinations"):
  - "Backup server": `host.name` `is` `backup-01`, on the source documents. It is an exception as they are today.
  - "Internal destinations": `Esql.destination_domain` `matches` `*.corp.example.com`, on the computed columns.
- **Rows before the exceptions** (query 4): 5 rows: `backup-01` (2.4 GB), `build-07` (1.1 GB), `db-02` (650 MB), `laptop-ana` (900 MB), `laptop-ben` (700 MB).
- **How the rule ran:** succeeded, 2 alerts.
- **What was executed** (query 1): only the item on the computed column is at the end of the query. The source item is not in the log, because it is in the filter that goes with the request, and it removed the `backup-01` documents before the aggregation. The last line is:

```
| WHERE NOT (COALESCE(MV_LIKE(Esql.destination_domain, "*.corp.example.com"), false))
```

- **Alerts** (query 3): `laptop-ana` (`files.sharecloud.example.net`) and `db-02` (`paste.example.org`).
- **Say:** one list can mix exceptions on source fields and on computed columns, and each goes where it works.

### Case 3. Demo: Failed logins with stale exceptions

The query of case 1, with exceptions that cannot apply.

- **Exceptions** (list "Demo case 3: Stale exceptions"):
  - "Old scanner exception": `Esql.source_network` `is` `203.0.113.0`, expired yesterday.
  - "Country exception": `Esql.source_country` `is` `DE`. The query does not output that column.
- **How the rule ran:** succeeded, 6 alerts, because nothing is excluded.
- **What was executed** (query 1): no stage was added. `applied` is empty, and `not_applied` has the country exception with the code `item_never_matches` and the reason `"Esql.source_country" is not in the output of the query`. The expired item does not appear, because it is dropped before the checks.
- **Alerts** (query 3): the 6 networks of query 4.
- **Say:** an exception that cannot match is not applied and is reported, instead of failing the rule or hiding alerts.

### Case 4. Demo: Wrong column type (the rule fails)

The query of case 1. The exception `Esql.failed_count` `is` `25` declares the type `keyword`, and the query outputs `long`.

- **How the rule ran** (query 2): failed, with the message: `The rule did not run because exception items declare a column type that is not the type that the query outputs: the exception item "Failed count as text" (exception list "demo-esql-exceptions-list-4", exception item "failed-count-as-text") declares the column "Esql.failed_count" as keyword, and the query outputs it as long. Fix the type in these exception items, or remove them from this rule.`
- **What was executed:** nothing. The rule stops before the query runs. Query 1 has no row for this rule.
- **Alerts:** none.
- **Say:** a wrong type fails the rule with a message that names the item, the column and both types. The rule never runs with part of its exceptions.

### Case 5. Demo: Too many comparisons (the rule fails)

The query of case 1. One exception, `Esql.source_network` `is one of` 250 CIDR ranges (`10.1.0.0/16` to `10.250.0.0/16`).

- **How the rule ran** (query 2): failed, with the message: `The rule did not run because its exceptions do not fit in the query: the exceptions on the columns of the query need 250 comparisons, and at most 200 are allowed ... The exception items with the most comparisons are: the exception item "Many ranges" (exception list "demo-esql-exceptions-list-5", exception item "many-ranges") has 250. Remove values from those exception items, or remove the exception items that this rule does not need. ...`
- **What was executed:** nothing, as in case 4.
- **Alerts:** none.
- **Say:** a limit fails the rule before the query runs, and the message names the limit and the item to reduce.

### Case 6. Demo: Exception that matches every row (a warning)

The query of case 1. One exception: `Esql.source_country` `is not` `US`, on a column that the query does not output.

- **How the rule ran** (query 2): `partial failure`, with the message: `The rule creates no alerts because exception items exclude every row: the exception item "Everything but US" ... Each condition of these exception items has an exclusive operator on a column that the query does not output, which is true for every row. Remove these exception items from the rule, or add a condition on a column that the query outputs.`
- **What was executed** (query 1): the last line of the query is `| WHERE false`.
- **Alerts:** none.
- **Say:** an exclusive operator is true for a column that does not exist, so the exception matches every row. The rule says so instead of silently producing nothing.

### Case 7. The API refuses a bad value (no rule)

Creating an exception on a `long` column with the value `many`:

```bash
curl -s -X POST -u elastic:changeme -H 'kbn-xsrf: x' -H 'elastic-api-version: 2023-10-31' -H 'Content-Type: application/json' localhost:5601/kbn/api/exception_lists/items -d '{"list_id":"demo-esql-exceptions-list-4","item_id":"bad-value","name":"Failed count is many","description":"A value that is not a number on a long column","type":"simple","namespace_type":"single","applies_to":"esql_output_columns","entries":[{"field":"Esql.failed_count","type":"match","operator":"included","value":"many","value_type":"long"}]}'
```

The answer is a 400: `Invalid exception item: the entry on the field "Esql.failed_count": value "many" is not valid for a column of type long`. The item is not created. In the flyout, open "Add exception" from any list, choose "Computed columns", then set the field `Esql.failed_count`, the operator `is` and the type `long`, and type `many`. The message appears under the Value field and the save button stays disabled. I did not drive the flyout.

## Order of the video

1. Shared Exception Lists: show the six lists, open case 1 (the badge "Computed columns", the two items).
2. Discover, query 4 for case 1, then rule execution (case 1), query 1 (final query), query 3 (alerts).
3. Case 2 in the same order, then show that the source item is a different kind in the same list.
4. Case 3 (query 1 for the `not_applied` reason, query 3 for the six alerts).
5. Errors: query 2 shows the failed runs of cases 4 and 5 and the warning of case 6. Open each rule's Execution results tab for the message.
6. Case 6 query 1 for `WHERE false`.
7. Case 7 (flyout, then the API).
