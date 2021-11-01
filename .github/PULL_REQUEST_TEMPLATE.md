## Summary

Summarize your PR. If it involves visual changes include a screenshot or gif.


### Checklist

Delete any items that are not applicable to this PR.

- [ ] Any text added follows [EUI's writing guidelines](https://elastic.github.io/eui/#/guidelines/writing), uses sentence case text and includes [i18n support](https://github.com/elastic/kibana/blob/main/packages/kbn-i18n/README.md)
- [ ] [Documentation](https://www.elastic.co/guide/en/kibana/master/development-documentation.html) was added for features that require explanation or tutorials
- [ ] [Unit or functional tests](https://www.elastic.co/guide/en/kibana/master/development-tests.html) were updated or added to match the most common scenarios
- [ ] Any UI touched in this PR is usable by keyboard only (learn more about [keyboard accessibility](https://webaim.org/techniques/keyboard/))
- [ ] Any UI touched in this PR does not create any new axe failures (run axe in browser: [FF](https://addons.mozilla.org/en-US/firefox/addon/axe-devtools/), [Chrome](https://chrome.google.com/webstore/detail/axe-web-accessibility-tes/lhdoppojpmngadmnindnejefpokejbdd?hl=en-US))
- [ ] If a plugin configuration key changed, check if it needs to be allowlisted in the cloud and added to the [docker list](https://github.com/elastic/kibana/blob/main/src/dev/build/tasks/os_packages/docker_generator/resources/base/bin/kibana-docker)
- [ ] This renders correctly on smaller devices using a responsive layout. (You can test this [in your browser](https://www.browserstack.com/guide/responsive-testing-on-local-server))
- [ ] This was checked for [cross-browser compatibility](https://www.elastic.co/support/matrix#matrix_browsers)


### Risk Matrix

Delete this section if it is not applicable to this PR.

Before closing this PR, invite QA, stakeholders, and other developers to identify risks that should be tested prior to the change/feature release.

When forming the risk matrix, consider some of the following examples and how they may potentially impact the change:

| Risk                      | Probability | Severity | Mitigation/Notes        |
|---------------------------|-------------|----------|-------------------------|
| Multiple Spaces&mdash;unexpected behavior in non-default Kibana Space. | Low | High | Integration tests will verify that all features are still supported in non-default Kibana Space and when user switches between spaces. |
| Multiple nodes&mdash;Elasticsearch polling might have race conditions when multiple Kibana nodes are polling for the same tasks. | High | Low | Tasks are idempotent, so executing them multiple times will not result in logical error, but will degrade performance. To test for this case we add plenty of unit tests around this logic and document manual testing procedure. |
| Code should gracefully handle cases when feature X or plugin Y are disabled. | Medium | High | Unit tests will verify that any feature flag or plugin combination still results in our service operational. |
| [See more potential risk examples](https://github.com/elastic/kibana/blob/main/RISK_MATRIX.mdx) |


### For maintainers

- [ ] This was checked for breaking API changes and was [labeled appropriately](https://www.elastic.co/guide/en/kibana/master/contributing.html#kibana-release-notes-process)
