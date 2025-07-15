/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const smallest = `FROM a`;

export const sortCommandFromDocs = `FROM employees
| KEEP first_name, last_name, height
| SORT height`;

export const large = `
// This is a comment, not a "string"
FROM index, metrics:index, "another_index", """index""", metrics-metrics-metrics METADATA _id, _index
  /* This is a multiline
     comment */
//   | FORK (WHERE ?param.test == "asdf" | LIMIT 123) (LIMIT 123)
  | EVAL kb = bytes / 1024 * -1.23e456 + ?param <= 3, a = 5 WEEKS, foo = "baasdfr", ? <= ?asdf
  | WHERE process.name == "curl.exe /* asdf */" AND ?42 == 123 OR ?
  | WHERE event_duration > /* very big number */ 5000000
  | WHERE message LIKE "Connected*"
  | KEEP kb, destination.address, date, ip, email, num, avg.avg.avg
  // The ten is
  // very sensible number
  | LIMIT 10
  | STATS bytes = (SUM(destination.bytes, true))::INTEGER
  | SORT asdf
  | SORT @timestamp DESC, @timestamp ASC
  | SORT kb, date ASC NULLS FIRST, ip DESC NULLS LAST
  | DROP date, ip, \`AVG(FALSE, null, { "this": "is", "map": 123 })\`
  | RENAME field AS another_field, another_field AS field
  | RENAME unique_queries AS \`Unique Queries\`
  /**
   * Description, not "string"
   * @description This is a description
   * @color #0077ff
   */
  | DISSECT field """%{date} - %{msg} - %{ip}"""
  | GROK dns.question.name "asdf"
  | ENRICH languages_policy ON a WITH name = language_name, more
  | MV_EXPAND column
  | INLINESTATS count = COUNT(ROUND(AVG(
      MV_AVG(department.salary_change)), 10))
    BY languages
  | LOOKUP JOIN join_index ON x.foo`;
