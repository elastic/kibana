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
api-docs: ## Generate ESS Kibana OpenAPI bundles with kbn-openapi-bundler
	@node scripts/merge_ess_oas.js

.PHONY: api-docs-stateful
api-docs-stateful: ## Generate only kibana.yaml
	@node scripts/merge_ess_oas.js

.PHONY: api-docs-lint
api-docs-lint: ## Run redocly API docs linter
	@npx @redocly/cli lint "output/*.yaml" --config "linters/redocly.yaml" --format stylish --max-problems 500

.PHONY: api-docs-lint-stateful
api-docs-lint-stateful: ## Run redocly API docs linter on kibana.yaml
	@npx @redocly/cli lint "output/kibana.yaml" --config "linters/redocly.yaml" --format stylish --max-problems 500

.PHONY: api-docs-overlay
api-docs-overlay: ## Run spectral API docs linter on kibana.yaml
	@npx bump-cli overlay "output/kibana.yaml" "overlays/kibana.overlays.yaml" > "output/kibana.tmp1.yaml"
	@npx bump-cli overlay "output/kibana.tmp1.yaml" "overlays/alerting.overlays.yaml" > "output/kibana.tmp2.yaml"
	@npx bump-cli overlay "output/kibana.tmp2.yaml" "overlays/connectors.overlays.yaml" > "output/kibana.tmp3.yaml"
	@npx bump-cli overlay "output/kibana.tmp3.yaml" "overlays/kibana.overlays.shared.yaml" > "output/kibana.tmp4.yaml"
	@npx @redocly/cli bundle output/kibana.tmp4.yaml --ext yaml -o output/kibana.new.yaml
	rm output/kibana.tmp*.yaml

.PHONY: api-docs-preview
api-docs-preview: ## Generate a preview for kibana.yaml
	@npx bump-cli preview "output/kibana.yaml"

.PHONY: api-docs-overlay-preview
api-docs-overlay-preview: ## Generate a preview for kibana.new.yaml
	@npx bump-cli preview "output/kibana.new.yaml"

help:  ## Display help
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
#------------- <https://suva.sh/posts/well-documented-makefiles> --------------

.DEFAULT_GOAL := help

