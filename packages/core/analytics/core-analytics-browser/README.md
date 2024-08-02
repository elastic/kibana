# @kbn/core-analytics-browser

This package contains the public types for Core's browser-side analytics service.

## Enabling debug logging

Most events-related messages are logged under the `debug` level, which is silenced by default.

Until per-context logging configuration is available, use `logging.browser.root.level: DEBUG` to enable debug logging.