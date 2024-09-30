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

.PHONY: api-docs
api-docs: ## Generate Serverless and ESS Kibana OpenAPI bundles with kbn-openapi-bundler
	@node scripts/merge_serverless_oas.js
	@node scripts/merge_ess_oas.js

.PHONY: api-docs-staging
api-docs-staging: ## Generate Serverless and ESS Kibana OpenAPI bundles with kbn-openapi-bundler
	@node scripts/merge_serverless_oas_staging.js
	@node scripts/merge_ess_oas_staging.js

.PHONY: api-docs-stateful
api-docs-stateful: ## Generate only kibana.yaml
	@node scripts/merge_ess_oas.js

.PHONY: api-docs-serverless
api-docs-serverless: ## Generate only kibana.serverless.yaml
	@node scripts/merge_serverless_oas.js
	
.PHONY: api-docs-lint
api-docs-lint: ## Run spectral API docs linter 
	@npx @stoplight/spectral-cli lint "output/*.yaml" --ruleset ".spectral.yaml"

.PHONY: api-docs-lint-errs
api-docs-lint-errs: ## Run spectral API docs linter and return only errors
	@npx @stoplight/spectral-cli lint "output/*.yaml" --ruleset ".spectral.yaml" -D

.PHONY: api-docs-lint-stateful
api-docs-lint-stateful: ## Run spectral API docs linter on kibana.yaml
	@npx @stoplight/spectral-cli lint "output/kibana.yaml" --ruleset ".spectral.yaml"

.PHONY: api-docs-lint-serverless
api-docs-lint-serverless: ## Run spectral API docs linter on kibana.serverless.yaml
	@npx @stoplight/spectral-cli lint "output/kibana.serverless.yaml" --ruleset ".spectral.yaml"

.PHONY: api-docs-overlay
api-docs-overlay: ## Run spectral API docs linter on kibana.serverless.yaml
	@npx bump overlay "output/kibana.serverless.yaml" "overlays/kibana.overlays.serverless.yaml" > "output/kibana.serverless.tmp1.yaml"
	@npx bump overlay "output/kibana.serverless.tmp1.yaml" "overlays/alerting.overlays.yaml" > "output/kibana.serverless.tmp2.yaml"
	@npx bump overlay "output/kibana.serverless.tmp2.yaml" "overlays/connectors.overlays.yaml" > "output/kibana.serverless.tmp3.yaml"
	@npx bump overlay "output/kibana.yaml" "overlays/kibana.overlays.yaml" > "output/kibana.tmp1.yaml"
	@npx bump overlay "output/kibana.tmp1.yaml" "overlays/alerting.overlays.yaml" > "output/kibana.tmp2.yaml"
	@npx bump overlay "output/kibana.tmp2.yaml" "overlays/connectors.overlays.yaml" > "output/kibana.tmp3.yaml"
	@npx @redocly/cli bundle output/kibana.serverless.tmp3.yaml --ext yaml -o output/kibana.serverless.new.yaml
	@npx @redocly/cli bundle output/kibana.tmp3.yaml --ext yaml -o output/kibana.new.yaml
	rm output/kibana.tmp*.yaml
	rm output/kibana.serverless.tmp*.yaml

.PHONY: api-docs-preview
api-docs-preview: ## Generate a preview for kibana.yaml and kibana.serverless.yaml
	@npx bump preview "output/kibana.yaml"
	@npx bump preview "output/kibana.serverless.yaml"

.PHONY: api-docs-overlay-preview
api-docs-overlay-preview: ## Generate a preview for kibana.new.yaml and kibana.serverless.new.yaml
	@npx bump preview "output/kibana.new.yaml"
	@npx bump preview "output/kibana.serverless.new.yaml"

help:  ## Display help
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
#------------- <https://suva.sh/posts/well-documented-makefiles> --------------

.DEFAULT_GOAL := help

