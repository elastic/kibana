# Where exceptions in the DSL filter differ from the documentation

An ES|QL rule applies its exceptions today as a DSL filter on the `_query` request. This document lists the cases where that filter behaves differently from what the user documentation ([Add and manage exceptions](https://www.elastic.co/docs/solutions/security/detect-and-alert/add-manage-exceptions)) says, and the behavior that the documentation does not describe. The DSL behavior is unchanged by `esql_exceptions_proposal.md`: source-field exceptions keep running in the DSL filter. Exceptions on computed columns follow the documentation (see the last section).

## What the documentation says

- `is` and `is not` "must be an exact match of the defined value", and `is one of` matches any of the defined values.
- `matches` and `does not match` allow the wildcards `?` (one character) and `*` (zero or more), on a field whose type is `keyword`, `text` or `wildcard`.
- "Rule exceptions are case-sensitive."
- For ES|QL rules, exceptions apply only to the source fields of the index, not to the fields that commands such as `EVAL` add.

## Behavior that differs from the documentation

Each case gives the exception, the DSL clause it becomes, and the result. The documents in the examples are on a benign value that the exception targets (`good`) and a threat value (`bad`).

### 1. `is` and `is one of` on a `text` field

The documentation describes an exact, case-sensitive match. The DSL runs `match_phrase`, which compares analyzed tokens: Elasticsearch lowercases a `text` field and splits it into words when it indexes it, and it analyzes the value of the exception the same way.

Exception: `message` `is` `good.com`. DSL clause: `{"match_phrase":{"message":"good.com"}}`.

Given the documents `Connection to good.com failed`, `GOOD morning`, `Good.com`, `other thing`, `GOOD.COM` and `good.com`, the exception excludes `Connection to good.com failed`, `Good.com`, `GOOD.COM` and `good.com`. The exception `message` `is` `GOOD.COM` excludes the same four. The documentation leads to expect that only `good.com` is excluded, and only `GOOD.COM` for the second exception.

### 2. `matches` on a `text` field

The documentation describes wildcards on the value, case-sensitive. The DSL runs `wildcard`, which compares each token of the field with the pattern as written. The tokens are lowercase and the pattern is not lowercased.

Exception: `message` `matches` `GOOD*`. DSL clause: `{"wildcard":{"message":"GOOD*"}}`. Given the documents above, it excludes nothing, because no lowercase token matches an uppercase pattern. The documentation leads to expect that `GOOD morning` and `GOOD.COM` are excluded.

Exception: `message` `matches` `good*`. Given the documents `Connection to Good.com failed`, `connection to good.com` and `bad.com`, it excludes the first two, because the token `good.com` is inside the value. The documentation leads to expect that it excludes only a value that starts with `good`, so nothing here.

### 3. A `keyword` field with a normalizer

A `keyword` field can be mapped with a `lowercase` normalizer: Elasticsearch stores the value in lowercase for searching and lowercases the value of a search on it. The documentation describes a case-sensitive match. The DSL ignores the case.

Exception: `f` `matches` `AB*`. DSL clause: `{"wildcard":{"f":"AB*"}}`. Given the documents `f` = `ABC`, `abc`, `Abc` and `["ABC","x"]`, it excludes all four. The documentation leads to expect `ABC` and `["ABC","x"]` only.

The same applies to `is`: `f` `is` `ABC` excludes `abc` and `Abc` as well.

### 4. `is` on a `date` field

The documentation describes an exact match. The DSL runs `match_phrase`, which Elasticsearch turns into a term that it rounds to the unit of the value.

| Value of the exception | What it matches |
|---|---|
| A day (`2026-09-30`) | Every instant of that day |
| An hour, minute or second (`2026-09-30T14`, `2026-09-30T14:05`) | Every instant of that unit |
| A month or year (`2026-09`, `2026`) | Only the first day (`2026-09-01`, `2026-01-01`) |
| A value with a fraction (`2026-09-30T14:00:00.123Z`) | That instant |
| An offset (`2026-09-30T16:05:09+02:00`) | The same instant in UTC |
| Epoch milliseconds, or a value in the `format` of the field mapping | The matching instant |

Exception: `event.start` `is` `2026-09-30`. DSL clause: `{"match_phrase":{"event.start":"2026-09-30"}}`. Given a document with `event.start` = `2026-09-30T14:00:00.000Z`, it is excluded, and the exception excludes every event of that day. The documentation leads to expect that only an event at that exact value is excluded.

### 5. `is` on a range field

The documentation describes an exact match. On a range field (`long_range`, `integer_range`, `float_range`, `double_range`, `date_range`, `ip_range`) the DSL excludes the documents whose range contains the value.

Exception: `f` `is` `15`, where `f` is a `long_range`. Given a document with `f` = `[10, 20]`, it is excluded. The same holds for `2026-09-15` on a `date_range` and `10.0.0.5` on an `ip_range`.

### 6. `is` on an `ip` field with a CIDR value

The documentation describes an exact match. A value in CIDR notation matches every address in the range.

Exception: `source.ip` `is` `10.0.0.0/24`. DSL clause: `{"match_phrase":{"source.ip":"10.0.0.0/24"}}`. Given documents with `10.0.0.1` and `10.0.1.1`, it excludes the first. On a multi-valued field, it excludes a document when any value is in the range.

### 7. `matches` on a type that the documentation does not list

The documentation says that the field type must be `keyword`, `text` or `wildcard`. The DSL also runs `matches` on `version`, `match_only_text`, `pattern_text`, `search_as_you_type`, the root of a `flattened` field, `constant_keyword`, `join` and an `alias` to a string field. It fails with an error on any other type. The UI offers `matches` only for the string-kind types: `string`, `text`, `match_only_text`, `keyword`, `version`, `_id` and `_type`.

## Behavior that the documentation does not describe

- **A field that is not in the mapping.** `is`, `matches` and `exists` never match it, and the negative operators (`is not`, `is not one of`, `does not match`, `does not exist`) exclude every document. This applies to a shared list that names a field that the rule's indices do not map. It also applies to every field on which the positive operator never matches, such as an `object`, `nested` or `passthrough` parent.
- **A value that does not parse.** The filter builder does not check the value, and Elasticsearch rejects it when it runs the search: `not-an-ip` on an `ip` field, `abc` on a number, `maybe` on a `boolean` and `not-a-date` on a `date` field. The rule fails and creates no alerts.
- **An operator that the field type does not support.** `is` on a `geo_point`, `binary` or vector field fails the search, and so does `matches` on a numeric, `ip`, `date` or `boolean` field. The rule fails and creates no alerts, and one such index fails the request for every index in the `FROM`: documents that the exception never targeted stop alerting too.
- **A field mapped with different types.** The DSL query resolves the type per index. A conflict that the operator supports in each index works, and a conflict where it fails in one index fails the rule. The documentation says only that conflicting fields "might cause unexpected exceptions behavior".
- **A multi-valued field.** A positive operator matches when any value of the field matches, so the exception excludes the document.

## What this means for exceptions on computed columns

An exception on a computed column (a `STATS` output, an `EVAL` value or a renamed column) is applied at the end of the query as a `| WHERE` stage, and it follows the documentation: `is` compares the whole value, `matches` takes the wildcards on the whole value, and the comparison respects case. So the same exception can exclude different documents on a source field and on a computed column in cases 1, 2 and 3 above. The end of the query reproduces the DSL behavior of cases 4 and 6 (the rounding of dates and the CIDR ranges), and it does not apply range fields (case 5), because ES|QL has no column of those types. See `esql_exceptions_proposal.md`.

The statement of the documentation that exceptions "are only applied to the index source fields" for ES|QL rules stops being true when the advanced setting `securitySolution:enableEsqlRuleComputedFieldExceptions` is enabled, and the documentation has to change with the release.

Related documents: `esql_exceptions_v1_inventory.md` (what every operator does on every field type) and `esql_exceptions_operator_parity.md`.
