---
name: Failing Test
about: File to report flaky and/or failing tests
title: "[Failing Test] - [Test path here]"
labels: failed-test, high, triage_needed
assignees: ''

---

### Failing test name/path

Add the failing test name here. Please don't create one issue per ci group with a failing test. Many times the first failing test will cause subsequent failing tests. Having separate issues for each one creates a lot of noise and adds overhead to track each one down.  We really only care about the first failed test.  If we fix that and a subsequent one continues to fail, we'll focus on that next.

** A link to the failing build is helpful but these will expire so the rest of the information is important! **

### Build stats screenshot to show history

A screenshot showing how often this test is failing will help the team prioritize it, and figure out whether a test is flaky or a real bug.  Go to [this dashboard](https://build-stats.elastic.co/app/kibana#/dashboard/02b9d310-9513-11e8-a9c0-db5f285c257f) and search for the test error over the last 90 days, take a screenshot, and paste here.

### Stack trace

Copy and paste the *Stack trace* from the build here, it can be found by clicking on the test name where it's listed under `Test Results`

### Standard output

Please also include the standard output!  This is way more helpful in debugging test issues than just the stack trace as it lets us see what was happening *before* the test failed.  It also includes browser console output at the end, which may include relevant errors.

### Screenshots and attachments

Helpful screenshots can be found under the `Google Cloud Storage Upload Report` link on the build.  Download and include the png for the relevant, first, failing test. The link could look something like: `test/functional/screenshots/failure/logstash pipeline list route _before all_ hook.png`.  The html output is helpful as well.
