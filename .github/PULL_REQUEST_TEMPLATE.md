## Summary
<!-- A short, clear statement of the proposed changes. -->

## How to test
<!-- Include steps for testing your PR and screenshots (if applicable). -->

## Risk matrix
<!--
Provide a matrix or statement of known risks and how they are mitigated.
See risk examples: https://github.com/elastic/kibana/blob/main/RISK_MATRIX.mdx
-->

| Risk                      | Probability | Severity | Mitigation/Notes        |
|---------------------------|-------------|----------|-------------------------|

### Checklist

<!-- Delete any items that are not applicable to this PR. -->

- [ ] Any text added follows [EUI's writing guidelines](https://elastic.github.io/eui/#/guidelines/writing), uses sentence case text and includes [i18n support](https://github.com/elastic/kibana/blob/main/packages/kbn-i18n/README.md)
- [ ] [Documentation](https://www.elastic.co/guide/en/kibana/master/development-documentation.html) was added for features that require explanation or tutorials
- [ ] [Unit or functional tests](https://www.elastic.co/guide/en/kibana/master/development-tests.html) were updated or added to match the most common scenarios
- [ ] [Flaky Test Runner](https://ci-stats.kibana.dev/trigger_flaky_test_runner/1) was used on any tests changed
- [ ] Any UI touched in this PR is usable by keyboard only (learn more about [keyboard accessibility](https://webaim.org/techniques/keyboard/))
- [ ] Any UI touched in this PR does not create any new axe failures (run axe in browser: [FF](https://addons.mozilla.org/en-US/firefox/addon/axe-devtools/), [Chrome](https://chrome.google.com/webstore/detail/axe-web-accessibility-tes/lhdoppojpmngadmnindnejefpokejbdd?hl=en-US))
- [ ] If a plugin configuration key changed, check if it needs to be allowlisted in the cloud and added to the [docker list](https://github.com/elastic/kibana/blob/main/src/dev/build/tasks/os_packages/docker_generator/resources/base/bin/kibana-docker)
- [ ] This renders correctly on smaller devices using a responsive layout. (You can test this [in your browser](https://www.browserstack.com/guide/responsive-testing-on-local-server))
- [ ] This was checked for [cross-browser compatibility](https://www.elastic.co/support/matrix#matrix_browsers)
