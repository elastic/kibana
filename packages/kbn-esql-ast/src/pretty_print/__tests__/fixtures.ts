/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const query1 = `
from kibana_sample_data_logs
| EVAL timestamp=DATE_TRUNC(3 hour, @timestamp), status = CASE(    to_integer(response.keyword) >= 200 and to_integer(response.keyword) < 400, "HTTP 2xx and 3xx",    to_integer(response.keyword) >= 400 and to_integer(response.keyword) < 500, "HTTP 4xx",     "HTTP 5xx")
| stats results = count(*) by \`Over time\` = BUCKET(timestamp, 50, ?t_start, ?t_end), status
`;

export const query2 = `
from kibana_sample_data_logs
| sort @timestamp
| eval t = now()
| eval key = case(timestamp < t - 1 hour and timestamp > t - 2 hour, "Last hour", "Other")
| stats sum = sum(bytes), count = count_distinct(clientip) by key, extension.keyword
| eval sum_last_hour = case(key == "Last hour", sum), sum_rest = case(key == "Other", sum), count_last_hour = case(key == "Last hour", count), count_rest = case(key == "Other", count)
| stats sum_last_hour = max(sum_last_hour), sum_rest = max(sum_rest), count_last_hour = max(count_last_hour), count_rest = max(count_rest) by key, extension.keyword
| eval total_bytes = to_double(coalesce(sum_last_hour, 0::long) + coalesce(sum_rest, 0::long))
| eval total_visits = to_double(coalesce(count_last_hour, 0::long) + coalesce(count_rest, 0::long))
| eval bytes_transform = round(total_bytes / 1000000.0, 1)
| eval bytes_transform_last_hour = round(sum_last_hour / 1000.0, 2)
| keep count_last_hour, total_visits, bytes_transform, bytes_transform_last_hour, extension.keyword
| stats count_last_hour = sum(count_last_hour), total_visits = sum(total_visits), bytes_transform = sum(bytes_transform), bytes_transform_last_hour = sum(bytes_transform_last_hour) by extension.keyword
| rename total_visits as \`Unique Visits (Total)\`, count_last_hour as \`Unique Visits (Last hour)\`, bytes_transform as \`Bytes(Total - MB)\`, bytes_transform_last_hour as \`Bytes(Last hour - KB)\`, extension.keyword as \`Type\`
`;

export const query3 = `
from kibana_sample_data_logs
| keep bytes, clientip, url.keyword, response.keyword
| EVAL type = CASE(to_integer(response.keyword) >= 400 and to_integer(response.keyword) < 500, "4xx", to_integer(response.keyword) >= 500, "5xx", "Other")
| stats Visits = count(), Unique = count_distinct(clientip), p95 = percentile(bytes, 95), median = median(bytes) by type, url.keyword
| eval count_4xx = case(type == "4xx", Visits), count_5xx = case(type == "5xx", Visits), count_rest =  case(type == "Other", Visits)
| stats count_4xx = sum(count_4xx), count_5xx  = sum(count_5xx), count_rest = sum(count_rest), Unique = sum(Unique),\`95th percentile of bytes\` = max(p95), \`Median of bytes\` = max(median)  BY url.keyword
| eval count_4xx = COALESCE(count_4xx, 0::LONG), count_5xx = COALESCE(count_5xx, 0::LONG), count_rest = COALESCE(count_rest, 0::LONG)
| eval total_records = TO_DOUBLE(count_4xx + count_5xx + count_rest)
| eval percentage_4xx = count_4xx / total_records, percentage_5xx = count_5xx / total_records
| eval percentage_4xx = round(100 * percentage_4xx, 2)
| eval percentage_5xx = round(100 * percentage_5xx, 2)
| drop count_4xx, count_rest, total_records
| RENAME percentage_4xx as \`HTTP 4xx\`, percentage_5xx as \`HTTP 5xx\`
`;

export const query4 = `
from kibana_sample_data_logs, kibana_sample_data_flights, kibana_sample_data_ecommerce,
  index1, my-data-2024-*, my-data-2025-01-*, xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx, yyyy-yyyy-yyyy-yyyy-yyyy-yyyy-yyyy-yyyy-yyyy
  METADATA _index, _id, _type, _score

| sort @timestamp
| eval t = now()
| eval key = case(timestamp < t - 1 hour and timestamp > t - 2 hour, "Last hour", "Other")
| stats sum = sum(bytes), count = count_distinct(clientip) by key, extension.keyword
| eval sum_last_hour = case(key == "Last hour", sum), sum_rest = case(key == "Other", sum), count_last_hour = case(key == "Last hour", count), count_rest = case(key == "Other", count)
| stats sum_last_hour = max(sum_last_hour), sum_rest = max(sum_rest), count_last_hour = max(count_last_hour), count_rest = max(count_rest) by key, extension.keyword
| eval total_bytes = to_double(coalesce(sum_last_hour, 0::long) + coalesce(sum_rest, 0::long))
| eval total_visits = to_double(coalesce(count_last_hour, 0::long) + coalesce(count_rest, 0::long))
| eval bytes_transform = round(total_bytes / 1000000.0, 1)
| eval bytes_transform_last_hour = round(sum_last_hour / 1000.0, 2)
| keep count_last_hour, total_visits, bytes_transform, bytes_transform_last_hour, extension.keyword
| stats count_last_hour = sum(count_last_hour), total_visits = sum(total_visits), bytes_transform = sum(bytes_transform), bytes_transform_last_hour = sum(bytes_transform_last_hour) by extension.keyword
| rename total_visits as \`Unique Visits (Total)\`, count_last_hour as \`Unique Visits (Last hour)\`, bytes_transform as \`Bytes(Total - MB)\`, bytes_transform_last_hour as \`Bytes(Last hour - KB)\`, extension.keyword as \`Type\`
`;
