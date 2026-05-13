# AppEx QA queries

Here are some sample ES|QL queries you can use to investigate failures in the AppEx QA cluster.

Replace the `test.id` with the test ID:

```
FROM scout-test-events-*
| WHERE event.action == "test-end"
  AND test.status == "failed"
  AND test.id == <test-id>
  AND @timestamp >= NOW() - 15 days
  AND buildkite.pipeline.slug != "kibana-pull-request"
| KEEP @timestamp,
       buildkite.pipeline.slug,
       buildkite.build.url,
       buildkite.branch,
       test.title,
       test.file.path,
       test.status,
       event.error.message,
       event.error.stack_trace
| SORT @timestamp DESC
| LIMIT 200
```

You can also query by `test.tile` and `test.file.path`.
