#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0 and the Server Side Public License, v 1; you may not use this file except
# in compliance with, at your election, the Elastic License 2.0 or the Server
# Side Public License, v 1.
#

"""Public API interface for all Kibana Bazel custom rules.
Please do not import from any other files when looking to use a custom rule
"""

load("//src/dev/bazel:pkg_npm.bzl", _pkg_npm = "pkg_npm")
load("//src/dev/bazel:ts_project.bzl", _ts_project = "ts_project")

pkg_npm = _pkg_npm
ts_project = _ts_project
