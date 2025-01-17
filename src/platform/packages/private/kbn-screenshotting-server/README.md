# @kbn/screenshotting-server

Stateless code pertaining to the capture of screenshots for Kibana Reporting

### Notes on screenshotting server's dependency on chromium

We leverage the standalone headless chrome binary provided by the chromium team, see [here](https://developer.chrome.com/blog/chrome-headless-shell) for the announcement.

We however don't consume this binary through the `@puppeteer/browsers` helper util, so that we can provide the required version of the varying platforms we support and  further more validate that the archive and binary we get would be guaranteed to generate reports as should.
