## Summary

Summarize your PR. If it involves visual changes include a screenshot or gif.


### Checklist

Check the PR satisfies following conditions. 

Reviewers should verify this PR satisfies this list as well.

- [ ] Any text added follows [EUI's writing guidelines](https://elastic.github.io/eui/#/guidelines/writing), uses sentence case text and includes [i18n support](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-i18n/README.md)
- [ ] [Documentation](https://www.elastic.co/guide/en/kibana/master/development-documentation.html) was added for features that require explanation or tutorials
- [ ] [Unit or functional tests](https://www.elastic.co/guide/en/kibana/master/development-tests.html) were updated or added to match the most common scenarios
- [ ] If a plugin configuration key changed, check if it needs to be allowlisted in the cloud and added to the [docker list](https://github.com/elastic/kibana/blob/main/src/dev/build/tasks/os_packages/docker_generator/resources/base/bin/kibana-docker)
- [ ] This was checked for breaking HTTP API changes, and any breaking changes have been approved by the breaking-change committee. The `release_note:breaking` label should be applied in these situations.
- [ ] [Flaky Test Runner](https://ci-stats.kibana.dev/trigger_flaky_test_runner/1) was used on any tests changed
- [ ] The PR  description includes the appropriate Release Notes section, and the correct `release_note:*` label is applied per the [guidelines](https://www.elastic.co/guide/en/kibana/master/contributing.html#kibana-release-notes-process)
- [ ] Review the [backport guidelines](https://docs.google.com/document/d/1VyN5k91e5OVumlc0Gb9RPa3h1ewuPE705nRtioPiTvY/edit?usp=sharing) and apply applicable `backport:*` labels.

### Identify risks

Does this PR introduce any risks? For example, consider risks like hard to test bugs, performance regression, potential of data loss.

Describe the risk, its severity, and mitigation for each identified risk. Invite stakeholders and evaluate how to proceed before merging.

- [ ] [See some risk examples](https://github.com/elastic/kibana/blob/main/RISK_MATRIX.mdx)
- [ ] ...



