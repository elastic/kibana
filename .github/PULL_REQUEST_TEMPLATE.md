## Summary

Summarize your PR. If it involves visual changes include a screenshot or gif.

### Checklist

Delete any items that are not applicable to this PR.

- [ ] Any text added follows [EUI's writing guidelines](https://elastic.github.io/eui/#/guidelines/writing), uses sentence case text and includes [i18n support](https://github.com/elastic/kibana/blob/master/packages/kbn-i18n/README.md)
- [ ] [Documentation](https://www.elastic.co/guide/en/kibana/master/development-documentation.html) was added for features that require explanation or tutorials
- [ ] [Unit or functional tests](https://www.elastic.co/guide/en/kibana/master/development-tests.html) were updated or added to match the most common scenarios
- [ ] Any UI touched in this PR is usable by keyboard only (learn more about [keyboard accessibility](https://webaim.org/techniques/keyboard/))
- [ ] Any UI touched in this PR does not create any new axe failures (run axe in browser: [FF](https://addons.mozilla.org/en-US/firefox/addon/axe-devtools/), [Chrome](https://chrome.google.com/webstore/detail/axe-web-accessibility-tes/lhdoppojpmngadmnindnejefpokejbdd?hl=en-US))
- [ ] This renders correctly on smaller devices using a responsive layout. (You can test this [in your browser](https://www.browserstack.com/guide/responsive-testing-on-local-server))
- [ ] This was checked for [cross-browser compatibility](https://www.elastic.co/support/matrix#matrix_browsers)

### For maintainers

- [ ] This was checked for breaking API changes and was [labeled appropriately](https://www.elastic.co/guide/en/kibana/master/contributing.html#kibana-release-notes-process)
