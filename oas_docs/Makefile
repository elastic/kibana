# ELASTICSEARCH CONFIDENTIAL
# __________________
#
#  Copyright Elasticsearch B.V. All rights reserved.
#
# NOTICE:  All information contained herein is, and remains
# the property of Elasticsearch B.V. and its suppliers, if any.
# The intellectual and technical concepts contained herein
# are proprietary to Elasticsearch B.V. and its suppliers and
# may be covered by U.S. and Foreign Patents, patents in
# process, and are protected by trade secret or copyright
# law.  Dissemination of this information or reproduction of
# this material is strictly forbidden unless prior written
# permission is obtained from Elasticsearch B.V.

VERSION_REDOCLY_CLI:=1.12.2

.PHONY: api-docs
api-docs: redocly-cli
	redocly join "kibana.info.serverless.yaml" "../x-pack/plugins/actions/docs/openapi/bundled_serverless.yaml" "../src/plugins/data_views/docs/openapi/bundled.yaml" "../x-pack/plugins/ml/common/openapi/ml_apis_serverless.yaml" "../packages/core/saved-objects/docs/openapi/bundled.yaml" -o "kibana.serverless.yaml" --prefix-components-with-info-prop title

.PHONY: api-docs-lint
api-docs-lint: ## Run spectral API docs linter
	spectral lint "kibana.serverless.yaml" --ruleset ".spectral.yaml"

.PHONY: redocly-cli
redocly-cli: ## Install redocly-cli: https://github.com/Redocly/redocly-cli
ifneq ($(VERSION_REDOCLY_CLI), $(shell redocly --version))
	npm install -g @redocly/cli@$(VERSION_REDOCLY_CLI)
endif
