# @kbn/ci-stats-shipper-cli

Simple CLI that runs in CI to ship the metrics produced by the build process. We used to ship these metrics as part of the build, but in order to enable distributed caching of optimizer bundles (which we still don't do) we broke the metrics out of the build and write them to disk instead, to be shipped at a later time.

Run `node scripts/ship_ci_stats --help` for usage information.