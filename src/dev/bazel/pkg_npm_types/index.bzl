#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0 and the Server Side Public License, v 1; you may not use this file except
# in compliance with, at your election, the Elastic License 2.0 or the Server
# Side Public License, v 1.
#

"""Public API interface for pkg_npm_types rule.
Please do not import from any other files when looking to this rule
"""

load(":pkg_npm_types.bzl", _pkg_npm_types = "pkg_npm_types")

pkg_npm_types = _pkg_npm_types
