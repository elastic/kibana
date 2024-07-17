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
api-docs: ## Generate kibana.serverless.yaml
	@npx @redocly/cli join "kibana.info.serverless.yaml" "../x-pack/plugins/observability_solution/apm/docs/openapi/apm.yaml" "../x-pack/plugins/actions/docs/openapi/bundled_serverless.yaml" "../src/plugins/data_views/docs/openapi/bundled.yaml" "../x-pack/plugins/ml/common/openapi/ml_apis_serverless.yaml" "../packages/core/saved-objects/docs/openapi/bundled_serverless.yaml" "../x-pack/plugins/observability_solution/slo/docs/openapi/slo/bundled.yaml" -o "kibana.serverless.yaml" --prefix-components-with-info-prop title

.PHONY: api-docs-lint
api-docs-lint: ## Run spectral API docs linter
	@npx @stoplight/spectral-cli lint "kibana.serverless.yaml" --ruleset ".spectral.yaml"

help:  ## Display help
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
#------------- <https://suva.sh/posts/well-documented-makefiles> --------------

.DEFAULT_GOAL := help

