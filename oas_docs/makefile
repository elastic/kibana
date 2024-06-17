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

VERSION_SPECTRAL_CLI:=6.11.1

.PHONY: api-docs
api-docs: # Generate kibana.serverless.yaml
	@npx @redocly/cli join "kibana.info.serverless.yaml" "../x-pack/plugins/observability_solution/apm/docs/openapi/apm.yaml" "../src/plugins/data_views/docs/openapi/bundled.yaml" "../packages/core/saved-objects/docs/openapi/bundled.yaml" "../x-pack/plugins/observability_solution/slo/docs/openapi/slo/bundled.yaml" -o "kibana.serverless.yaml" --prefix-components-with-info-prop title
	@$(MAKE) api-docs-lint

.PHONY: api-docs-lint
api-docs-lint: spectral-cli ## Run spectral API docs linter
	spectral lint "kibana.serverless.yaml" --ruleset ".spectral.yaml"

.PHONY: spectral-cli
spectral-cli: ## Install spectral-cli per https://github.com/stoplightio/spectral
ifneq ($(VERSION_SPECTRAL_CLI), $(shell spectral --version))
	npm install -g @stoplight/spectral-cli@$(VERSION_SPECTRAL_CLI)
endif
