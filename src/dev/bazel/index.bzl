#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0 and the Server Side Public License, v 1; you may not use this file except
# in compliance with, at your election, the Elastic License 2.0 or the Server
# Side Public License, v 1.
#

"""Public API interface for Bazel custom rules.
Please do not import from any other files when looking to use a custom rule
"""

load("//src/dev/bazel:jsts_transpiler.bzl", _jsts_transpiler = "jsts_transpiler")
load("//src/dev/bazel/types_pkg:types_pkg.bzl", _types_pkg = "types_pkg")

jsts_transpiler = _jsts_transpiler
types_pkg = _types_pkg
