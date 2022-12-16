# @kbn/core-usage-data-base-server-internal

This package contains internal base types and constants for Core's server-side `usage-data` domain that are used
across some other domains.

The purpose of the package is mostly to break the cyclic dependency between the `core-usage-data` and `savedObjects` services.