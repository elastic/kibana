# Demo plan: exceptions on computed columns in ES|QL rules

Status: plan for review. Nothing described here has been created yet.

## What the video shows

For each case, the same four things, in this order:

1. **The exceptions**: the exception list as the user sees it in Rules > Shared Exception Lists, with the "Computed columns" badge.
2. **How the rule ran**: the rule details page, Execution results tab (status, message, number of alerts).
3. **What was executed**: Discover in ES|QL mode, reading the rule execution log in `.kibana-event-log-*`. The log message holds the final query (with the `| WHERE` stage that the exceptions became), the exceptions that were applied and the ones that were not, with the reason.
4. **The alerts that survived**: Discover in ES|QL mode, reading `.alerts-security.alerts-default`, next to the rows that the rule query returns before the exceptions.

## The data

Two indices, generated with timestamps from the last 30 minutes (the rules read the last hour), so the alerts appear on the first run. The generator can be run again to refresh the timestamps.

| Index | What it holds | Fields |
|---|---|---|
| `demo-auth` | Authentication events | `@timestamp`, `event.outcome`, `source.ip` (ip), `user.name`, `host.name` |
| `demo-network` | Outbound transfers | `@timestamp`, `host.name`, `user.name`, `destination.domain`, `network.bytes` (long) |

`demo-auth` has these failed logins, grouped by the `/24` network of the source address (the rule threshold is 20):

| Network | Failed logins | Who it is |
|---|---|---|
| `10.20.1.0` | 34 | Corporate VPN exit |
| `10.20.2.0` | 28 | Corporate VPN exit |
| `198.51.100.0` | 41 | Partner vulnerability scanner |
| `203.0.113.0` | 57 | Real attack |
| `192.0.2.0` | 25 | Real attack |
| `100.64.7.0` | 22 | Real attack |
| `172.16.5.0` | 9 | Below the threshold, never returned by the rule |

`demo-network` has these transfers (the rule threshold is 500,000,000 bytes per host and destination):

| Host | Destination | Bytes | Who it is |
|---|---|---|---|
| `backup-01` | `storage.backup.example.com` | 2.4 GB | The backup server |
| `build-07` | `registry.corp.example.com` | 1.1 GB | Internal registry |
| `laptop-ben` | `updates.corp.example.com` | 700 MB | Internal updates |
| `laptop-ana` | `files.sharecloud.example.net` | 900 MB | Real finding |
| `db-02` | `paste.example.org` | 650 MB | Real finding |
| `laptop-eva` | `cdn.example.net` | 120 MB | Below the threshold |

## The rules

All rules are ES|QL rules, run every minute, read the last hour, and have names that start with `Demo:`. Each case has its own shared exception list, so the video can show one list at a time.

### Happy path

**Case 1. Demo: Many failed logins from one network.** Alert when a network has 20 or more failed logins.

```
FROM demo-auth
| WHERE event.outcome == "failure"
| EVAL Esql.source_network = IP_PREFIX(source.ip, 24, 0)
| STATS Esql.failed_count = COUNT(*) BY Esql.source_network
| WHERE Esql.failed_count >= 20
```

Exceptions, both on the computed column `Esql.source_network` (type `ip`):
- "Corporate VPN exit": `is` the range `10.20.0.0/16`.
- "Partner scanners": `is one of` `198.51.100.0` and `198.18.0.0`.

Expected: the query returns 6 rows. The two exceptions exclude 3 (both VPN networks and the scanner). **3 alerts**: `203.0.113.0`, `192.0.2.0`, `100.64.7.0`. The log shows one `| WHERE` stage with a range test and a list test, both items applied.

**Case 2. Demo: Large outbound transfer per host.** Alert when a host sends 500 MB or more to one destination.

```
FROM demo-network
| STATS Esql.total_bytes = SUM(network.bytes) BY host.name, Esql.destination_domain = destination.domain
| WHERE Esql.total_bytes >= 500000000
```

Exceptions, one of each kind in the same list:
- "Backup server": on the source field `host.name`, `is` `backup-01`. It applies to the source documents, as exceptions do today, so it stays in the DSL filter and is not part of the end-of-query stage.
- "Internal destinations": on the computed column `Esql.destination_domain` (type `keyword`), `matches` `*.corp.example.com`.

Expected: without exceptions the query returns 5 rows. The source exception removes the `backup-01` documents before the aggregation, and the computed exception excludes the two `corp.example.com` rows. **2 alerts**: `laptop-ana` and `db-02`. The log shows only the computed item as applied at the end of the query.

**Case 3. Demo: Failed logins with stale exceptions.** Same query as case 1, on its own list. It shows that exceptions that cannot apply are ignored and reported, and that the rule still runs.

Exceptions:
- "Old scanner exception" on `Esql.source_network`, `is` `203.0.113.0`, with an expiry date in the past. It is dropped before the query is built.
- "Country exception" on `Esql.source_country`, `is` `DE`. The query does not output that column, so the item can never match.

Expected: the rule succeeds and **6 alerts** are created (nothing is excluded). The log lists the second item as not applied with the code `item_never_matches` and the field name. The expired item does not appear, because it is removed before the checks.

### Error handling

**Case 4. Demo: Wrong column type.** Same query as case 1. The exception declares `Esql.failed_count` as `keyword`, but the query outputs it as `long`.

Expected: the rule **fails** before the query runs. The message names the item, the column, the declared type and the type that the query outputs. No alerts. The Execution results tab shows the failure, and Discover shows the same message in the event log.

**Case 5. Demo: Too many comparisons.** Same query as case 1. One exception, `is one of` with 250 CIDR ranges on `Esql.source_network`. Each range is one comparison and the limit is 200.

Expected: the rule **fails** before the query runs. The message names the limit (200 comparisons), the 250 that are needed and the item with the most comparisons, and says to remove values or items. No alerts.

**Case 6. Demo: Exception that matches every row.** Same query as case 1. One exception: `Esql.source_country` `is not` `US`, on a column that the query does not output. An exclusive operator is true for a column that does not exist, so the item matches every row.

Expected: the rule **runs with a warning** and creates **no alerts**. The stage is `| WHERE false`. The log shows the final query. This is the case to show that an exception that looks harmless can hide every alert, and that the rule says so.

**Case 7. The API refuses a bad value (no rule).** Creating an exception on a `long` column with the value `many` is rejected when the exception is saved, with a message that names the value and the type. The video shows the same message under the Value field in the flyout (the save button stays disabled) and the 400 response of the API. No rule is needed.

## What each segment opens

| Segment | Where |
|---|---|
| The exceptions | Rules > Shared Exception Lists, one list per case |
| How the rule ran | Rule details > Execution results |
| What was executed | Discover (ES|QL), the execution log query below |
| The surviving alerts | Discover (ES|QL), the alerts query below |

Execution log query (the field names of the message are confirmed when the script is built):

```
FROM .kibana-event-log-*
| WHERE event.provider == "securitySolution.ruleExecution" AND message LIKE "*esql_exceptions*"
| KEEP @timestamp, rule.name, message
| SORT @timestamp DESC
```

Rule status query (shows the failures and the warning of cases 4, 5 and 6):

```
FROM .kibana-event-log-*
| WHERE event.provider == "securitySolution.ruleExecution" AND event.action == "status-change"
| KEEP @timestamp, rule.name, kibana.alert.rule.execution.status, message
| SORT @timestamp DESC
```

Alerts query:

```
FROM .alerts-security.alerts-default
| WHERE kibana.alert.rule.name LIKE "Demo:*"
| KEEP @timestamp, kibana.alert.rule.name, Esql.source_network, Esql.failed_count, host.name, Esql.destination_domain, Esql.total_bytes
| SORT kibana.alert.rule.name
```

Rows before the exceptions (what the rule query returns, to compare with the alerts): the rule query of each case typed in Discover on its own.

## What I will create after your review

| Item | Where |
|---|---|
| `esql_exceptions_demo.mjs`: creates the indices and the documents, the shared exception lists and their items, and the rules, waits for the first runs and prints a summary of the alerts and statuses. `--clean` removes everything that it created (the `Demo:` rules, their alerts, the lists and the indices). `--refresh-data` rewrites the documents with new timestamps. | Repository root, with the other `esql_exceptions_*` scripts, which are not meant to be committed |
| `esql_exceptions_demo.md`: the order of the video, the Discover queries above with the expected results of each case, and the text to say. | Repository root |

## Things I need from you

1. **Advanced setting.** The execution log message is only written when `securitySolution:extendedRuleExecutionLoggingMinLevel` is `info` or lower. I would set it to `info` for the demo and tell you how to reset it. Is that fine?
2. **Space.** Everything goes in the Default space of the stack on `localhost:5601` (Elasticsearch on `localhost:9201`). Is that the one you will record?
3. **Case 6.** It is the least common case. Keep it in the video, or leave it for the written test plan?
4. **Real-world naming.** The rule and list names above are final unless you want other wording on screen.
