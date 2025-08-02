## Summary

Summarize your PR. If it involves visual changes include a screenshot or gif.

- **Related issue:** < LINK_TO_RELATED_ISSUE >
- **Feature flag:** < FEATURE_FLAG_HERE >
- **Docs ticket:** < LINK_TO_DOCS_TICKET_HERE >
- **Schema changes:** < LINK_SCHEMA_CHANGE_TICKET_HERE >

### How to test

Provide steps for reviewers to know how to test your PR. Assume that a reviewer may have little to no context when determining how detailed this section should be.

### Release Notes

The text that appears in the Release Notes is pulled directly from your PR title, or a single paragraph of text that you specify in the PR description. See [Release Notes Guidelines](https://www.elastic.co/guide/en/kibana/master/contributing.html#kibana-release-notes-process).

### Definition of done

Check the PR satisfies following conditions.

- [ ] Functional changes are hidden behind a feature flag. If not hidden, the PR explains why these changes are being implemented in a long-living feature branch. - [Feature flag guidelines](https://docs.elastic.dev/security-solution/process/detections/pull-requests#feature-toggling-for-everything)
- [ ] Functional changes are covered with a test plan and automated tests.
- [ ] PR is tested within MKI environment. MKI environment behavor differs and is not checked during the PR CI process. See guidelines for testing on MKI - [Manually testing PRs on MKI environments](https://docs.elastic.dev/security-solution/teams/analyst-experience/manual-testing/serverless/1.testing-PRs-on-MKI.mdx)
- [ ] Stability of new and changed tests is verified using the [Flaky Test Runner](https://ci-stats.kibana.dev/trigger_flaky_test_runner/1) in both ESS and Serverless. By default, use 200 runs for ESS and 200 runs for Serverless.
- [ ] Comprehensive manual testing is done by two engineers: the PR author and one of the PR reviewers. Changes are tested in both ESS and Serverless.
- [ ] Mapping changes are accompanied by a technical design document. It can be a GitHub issue or an RFC explaining the changes. The design document is shared with and approved by the appropriate teams and individual stakeholders.
- [ ] OpenAPI specs changes include detailed descriptions and examples of usage and are ready to be released in docs production - [docs site](https://docs.elastic.co/api-reference).
- [ ] Functional changes are communicated to the Docs team. A ticket is opened in [docs repo](https://github.com/elastic/security-docs) using the `Internal documentation request (Elastic employees)` template. The following information is included: feature flags used, target ESS version, planned timing for ESS and Serverless releases.
- [ ] Functional UI changes are profiled for performance, particularly when adding new UI or changing existing UI that is known to be vulnerable to performance issues - [Frontend Performance Guidelines](https://docs.elastic.dev/security-solution/process/detections/pull-requests#front-end-performance-guidelines).

### Kibana Checklist

Check the PR satisfies following conditions.

Reviewers should verify this PR satisfies this list as well.

- [ ] Any text added follows [EUI's writing guidelines](https://elastic.github.io/eui/#/guidelines/writing), uses sentence case text and includes [i18n support](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-i18n/README.md)
- [ ] If a plugin configuration key changed, check if it needs to be allowlisted in the cloud and added to the [docker list](https://github.com/elastic/kibana/blob/main/src/dev/build/tasks/os_packages/docker_generator/resources/base/bin/kibana-docker)
- [ ] This was checked for breaking HTTP API changes, and any breaking changes have been approved by the breaking-change committee. The `release_note:breaking` label should be applied in these situations.

### Identify risks

Does this PR introduce any risks? For example, consider risks like hard to test bugs, performance regression, potential of data loss.

Describe the risk, its severity, and mitigation for each identified risk. Invite stakeholders and evaluate how to proceed before merging.

- [ ] [See some risk examples](https://github.com/elastic/kibana/blob/main/RISK_MATRIX.mdx)
