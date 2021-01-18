## Summary

Summarize your PR. If it involves visual changes include a screenshot or gif.

### Checklist

Delete any items that are not applicable to this PR.

- [ ] Any text added follows [EUI's writing guidelines](https://elastic.github.io/eui/#/guidelines/writing), uses sentence case text and includes [i18n support](https://github.com/elastic/kibana/blob/master/packages/kbn-i18n/README.md)
- [ ] [Documentation](https://www.elastic.co/guide/en/kibana/master/development-documentation.html) was added for features that require explanation or tutorials
- [ ] [Unit or functional tests](https://www.elastic.co/guide/en/kibana/master/development-tests.html) were updated or added to match the most common scenarios
- [ ] This was checked for [keyboard-only and screenreader accessibility](https://developer.mozilla.org/en-US/docs/Learn/Tools_and_testing/Cross_browser_testing/Accessibility#Accessibility_testing_checklist)
- [ ] This renders correctly on smaller devices using a responsive layout. (You can test this [in your browser](https://www.browserstack.com/guide/responsive-testing-on-local-server)
- [ ] If a plugin configuration key changed, check if it needs to be whitelisted in the [cloud](https://github.com/elastic/cloud) and added to the [docker list](https://github.com/elastic/kibana/blob/c29adfef29e921cc447d2a5ed06ac2047ceab552/src/dev/build/tasks/os_packages/docker_generator/resources/bin/kibana-docker)
- [ ] This was checked for [cross-browser compatibility](https://www.elastic.co/support/matrix#matrix_browsers)

### For maintainers

- [ ] This was checked for breaking API changes and was [labeled appropriately](https://www.elastic.co/guide/en/kibana/master/contributing.html#kibana-release-notes-process)
