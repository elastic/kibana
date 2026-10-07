# @kbn/check-prod-native-modules-cli

Simple and straightforward CLI for searching for native modules installed as prod dependencies or as a result of any prod dependency.

Temporary exception for the non-mergeable profiling PoC ([#295800](https://github.com/elastic/kibana/pull/295800)): only `@datadog/pprof@5.19.0` is allowed, with a warning. Other versions and native dependencies (including nested dependencies) still fail. This branch-only exception is not production approval and must not be merged.