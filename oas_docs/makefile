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

api-docs: ## Generate ESS Kibana OpenAPI bundles with kbn-openapi-bundler
	@node scripts/merge_ess_oas.js

.PHONY: api-docs-redocly
api-docs-redocly: ## Generate kibana.yaml
	@npx @redocly/cli join "kibana.info.yaml" "../x-pack/plugins/alerting/docs/openapi/bundled.yaml" "../x-pack/plugins/observability_solution/apm/docs/openapi/apm.yaml" "../x-pack/plugins/cases/docs/openapi/bundled.yaml" "../x-pack/plugins/actions/docs/openapi/bundled.yaml" "../src/plugins/data_views/docs/openapi/bundled.yaml" "../x-pack/plugins/ml/common/openapi/ml_apis.yaml" "../packages/core/saved-objects/docs/openapi/bundled.yaml" "../x-pack/plugins/observability_solution/slo/docs/openapi/slo/bundled.yaml" "../x-pack/plugins/fleet/common/openapi/bundled.yaml" "bundle.json" -o "output/kibana.yaml" --prefix-components-with-info-prop title

.PHONY: api-docs-stateful
api-docs-stateful: ## Generate only kibana.yaml
	@node scripts/merge_ess_oas.js
	
.PHONY: api-docs-lint
api-docs-lint: ## Run spectral API docs linter 
	@npx @stoplight/spectral-cli lint "output/*.yaml" --ruleset ".spectral.yaml"

.PHONY: api-docs-lint-stateful
api-docs-lint-stateful: ## Run spectral API docs linter on kibana.yaml
	@npx @stoplight/spectral-cli lint "output/kibana.yaml" --ruleset ".spectral.yaml"

.PHONY: api-docs-overlay
api-docs-overlay: ## Run spectral API docs linter on kibana.yaml
	@npx bump overlay "output/kibana.yaml" "overlays/kibana.overlays.yaml" > "output/kibana.new.yaml"

help:  ## Display help
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
#------------- <https://suva.sh/posts/well-documented-makefiles> --------------

.DEFAULT_GOAL := help

