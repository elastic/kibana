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
api-docs: ## Generate Serverless and ESS Kibana OpenAPI bundles
	$(MAKE) merge-api-docs
	$(MAKE) api-docs-overlay
	$(MAKE) space-aware-api-docs

.PHONY: space-aware-api-docs
space-aware-api-docs: ## Add special space aware description entries
	@node scripts/promote_space_awareness.js oas_docs/output/kibana.yaml
	@node scripts/promote_space_awareness.js oas_docs/output/kibana.serverless.yaml

.PHONY: merge-api-docs
merge-api-docs: ## Merge Serverless and ESS Kibana OpenAPI bundles with kbn-openapi-bundler
	@node scripts/merge_serverless_oas.js
	@node scripts/merge_ess_oas.js

.PHONY: merge-api-docs-stateful
merge-api-docs-stateful: ## Merge only kibana.yaml
	@node scripts/merge_ess_oas.js

.PHONY: merge-api-docs-serverless
merge-api-docs-serverless: ## Merge only kibana.serverless.yaml
	@node scripts/merge_serverless_oas.js

.PHONY: api-docs-lint
api-docs-lint: ## Run redocly API docs linter
	@./node_modules/.bin/redocly lint "output/*.yaml" --config "linters/redocly.yaml" --format stylish --max-problems 500

.PHONY: api-docs-lint-stateful
api-docs-lint-stateful: ## Run redocly API docs linter on kibana.yaml
	@./node_modules/.bin/redocly lint "output/kibana.yaml" --config "linters/redocly.yaml" --format stylish --max-problems 500

.PHONY: api-docs-lint-serverless
api-docs-lint-serverless: ## Run redocly API docs linter on kibana.serverless.yaml
	@./node_modules/.bin/redocly lint "output/kibana.serverless.yaml" --config "linters/redocly.yaml" --format stylish --max-problems 500

.PHONY: api-docs-fix-required
api-docs-fix-required: ## Auto-generate required_field_fixes.overlays.yaml from merged OAS bundles
	@node scripts/generate_required_field_fixes.js

.PHONY: api-docs-overlay
api-docs-overlay: ## Apply all overlays (including bump-slim placeholder for Dashboards & Visualizations)
	@./node_modules/.bin/bump overlay "output/kibana.serverless.yaml" "overlays/kibana.overlays.serverless.yaml" > "output/kibana.serverless.tmp1.yaml"
	@./node_modules/.bin/bump overlay "output/kibana.serverless.tmp1.yaml" "overlays/alerting.overlays.yaml" > "output/kibana.serverless.tmp2.yaml"
	@./node_modules/.bin/bump overlay "output/kibana.serverless.tmp2.yaml" "overlays/connectors.overlays.yaml" > "output/kibana.serverless.tmp3.yaml"
	@./node_modules/.bin/bump overlay "output/kibana.serverless.tmp3.yaml" "overlays/kibana.overlays.shared.yaml" > "output/kibana.serverless.tmp4.yaml"
	@./node_modules/.bin/bump overlay "output/kibana.serverless.tmp4.yaml" "overlays/streams.overlays.yaml" > "output/kibana.serverless.tmp5.yaml"
	@./node_modules/.bin/bump overlay "output/kibana.serverless.tmp5.yaml" "overlays/dashboards.overlays.yaml" > "output/kibana.serverless.tmp6.yaml"
	@./node_modules/.bin/bump overlay "output/kibana.serverless.tmp6.yaml" "overlays/visualizations.overlays.yaml" > "output/kibana.serverless.tmp7.yaml"
	@./node_modules/.bin/bump overlay "output/kibana.serverless.tmp7.yaml" "overlays/kibana.overlays.bump_slim.yaml" > "output/kibana.serverless.tmp8.yaml"
	@./node_modules/.bin/bump overlay "output/kibana.yaml" "overlays/kibana.overlays.yaml" > "output/kibana.tmp1.yaml"
	@./node_modules/.bin/bump overlay "output/kibana.tmp1.yaml" "overlays/alerting.overlays.yaml" > "output/kibana.tmp2.yaml"
	@./node_modules/.bin/bump overlay "output/kibana.tmp2.yaml" "overlays/connectors.overlays.yaml" > "output/kibana.tmp3.yaml"
	@./node_modules/.bin/bump overlay "output/kibana.tmp3.yaml" "overlays/kibana.overlays.shared.yaml" > "output/kibana.tmp4.yaml"
	@./node_modules/.bin/bump overlay "output/kibana.tmp4.yaml" "overlays/streams.overlays.yaml" > "output/kibana.tmp5.yaml"
	@./node_modules/.bin/bump overlay "output/kibana.tmp5.yaml" "overlays/dashboards.overlays.yaml" > "output/kibana.tmp6.yaml"
	@./node_modules/.bin/bump overlay "output/kibana.tmp6.yaml" "overlays/visualizations.overlays.yaml" > "output/kibana.tmp7.yaml"
	@./node_modules/.bin/bump overlay "output/kibana.tmp7.yaml" "overlays/kibana.overlays.bump_slim.yaml" > "output/kibana.tmp8.yaml"
	@./node_modules/.bin/redocly bundle output/kibana.serverless.tmp8.yaml --ext yaml -o output/kibana.serverless.yaml
	@./node_modules/.bin/redocly bundle output/kibana.tmp8.yaml --ext yaml -o output/kibana.yaml
	rm -f output/kibana.tmp*.yaml
	rm -f output/kibana.serverless.tmp*.yaml

# ──────────────────────────────────────────────────────────────────────────────
# Producing kibana.external.yaml for external Dashboards/Visualizations hosting
# ⚠️  TEMPORARY — retire this target when Dashboards & Visualizations APIs reach GA.
# See https://github.com/elastic/kibana/issues/266195 for the full revert checklist.
# ──────────────────────────────────────────────────────────────────────────────
# This target is NOT run by CI. Run it manually whenever you need to update the
# external hosting repo (https://elastic.github.io/as-code-docs/).
#
# Full sequence (run after every Dashboards/Visualizations spec change — external docs
# will silently drift if you don't):
#   cd oas_docs
#   make api-docs-overlay-external    # re-merges the raw spec then applies all overlays
#                                     # except bump-slim → writes output/kibana.external.yaml
#   # copy output/kibana.external.yaml to the elastic/as-code-docs repo and publish
#
# Note: this target depends on merge-api-docs-stateful to always start from a
# fresh raw merged kibana.yaml, avoiding any previously applied overlays
# (including bump-slim) that would otherwise be baked into the input.
#
# Note: space-aware-api-docs is intentionally NOT applied here — that step
# injects Bump-specific HTML and would render incorrectly in other tools.
#
# Note: kibana.overlays.strip_request_examples.yaml IS applied here to remove
# requestBody.examples from Dashboards & Visualizations operations.  The
# external renderer relies on x-codeSamples exclusively; requestBody.examples
# are kept only in the Bump pipeline output (kibana.yaml / kibana.serverless.yaml).
# ──────────────────────────────────────────────────────────────────────────────
.PHONY: api-docs-overlay-external
api-docs-overlay-external: merge-api-docs-stateful api-docs-fix-required ## Apply all overlays except bump-slim — output is kibana.external.yaml (full Dashboards & Visualizations for external hosting)
	@./node_modules/.bin/bump overlay "output/kibana.yaml" "overlays/required_field_fixes.overlays.yaml" > "output/kibana.tmp0.yaml"
	@./node_modules/.bin/bump overlay "output/kibana.tmp0.yaml" "overlays/kibana.overlays.yaml" > "output/kibana.tmp1.yaml"
	@./node_modules/.bin/bump overlay "output/kibana.tmp1.yaml" "overlays/alerting.overlays.yaml" > "output/kibana.tmp2.yaml"
	@./node_modules/.bin/bump overlay "output/kibana.tmp2.yaml" "overlays/connectors.overlays.yaml" > "output/kibana.tmp3.yaml"
	@./node_modules/.bin/bump overlay "output/kibana.tmp3.yaml" "overlays/kibana.overlays.shared.yaml" > "output/kibana.tmp4.yaml"
	@./node_modules/.bin/bump overlay "output/kibana.tmp4.yaml" "overlays/streams.overlays.yaml" > "output/kibana.tmp5.yaml"
	@./node_modules/.bin/bump overlay "output/kibana.tmp5.yaml" "overlays/dashboards.overlays.yaml" > "output/kibana.tmp6.yaml"
	@./node_modules/.bin/bump overlay "output/kibana.tmp6.yaml" "overlays/visualizations.overlays.yaml" > "output/kibana.tmp7.yaml"
	@./node_modules/.bin/bump overlay "output/kibana.tmp7.yaml" "overlays/kibana.overlays.strip_request_examples.yaml" > "output/kibana.tmp8.yaml"
	@./node_modules/.bin/redocly bundle output/kibana.tmp8.yaml --ext yaml -o output/kibana.external.yaml
	rm -f output/kibana.tmp*.yaml

.PHONY: api-docs-preview
api-docs-preview: ## Generate a preview for kibana.yaml and kibana.serverless.yaml
	@echo "Rendering stateful docs preview..."
	@./node_modules/.bin/bump preview "output/kibana.yaml"
	@echo "Rendering serverless docs preview..."
	@./node_modules/.bin/bump preview "output/kibana.serverless.yaml"

help:  ## Display help
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
#------------- <https://suva.sh/posts/well-documented-makefiles> --------------

.DEFAULT_GOAL := help