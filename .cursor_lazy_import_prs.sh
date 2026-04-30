#!/usr/bin/env bash
set -euo pipefail
cd /Users/afharo/Developer/elastic/kibana-agent

WIP="wip/lazy-imports-all"

footer=$'## Follow-up\n\n- https://github.com/elastic/kibana/issues/171080 — add an ESLint rule so new plugins follow this pattern.\n\n---\n\n**Disclaimer:** This PR was prepared with AI assistance (Cursor / Claude); please review thoroughly.'

summary=$'## Summary\n\nLazy-load server plugin implementations via `await import(\'./plugin\')` (and related entrypoint adjustments) from `server/index.ts`, consistent with https://github.com/elastic/kibana/pull/170856.\n\nThe migration in #170856 reduced **startup time by ~4 seconds** in measured scenarios. **Memory savings were not quantified.**\n\n'

create_pr() {
  local branch="$1"
  local title="$2"
  local owners="$3"
  shift 3
  local files=("$@")

  git checkout main --quiet
  git branch -D "$branch" 2>/dev/null || true
  git checkout -b "$branch"
  git checkout "$WIP" -- "${files[@]}"
  git add -A
  if git diff --cached --quiet; then
    echo "SKIP empty: $branch"
    git checkout main --quiet
    git branch -D "$branch" 2>/dev/null || true
    return 0
  fi
  git commit -m "${title}"
  git push -u origin "$branch" --force-with-lease
  local body="${summary}## CODEOWNERS\n\n${owners}\n\n${footer}"
  gh pr create --draft --title "$title" --body "$body" --base main
  echo "OK $branch"
}

git checkout main --quiet
git pull origin main --ff-only --quiet

# 1 @elastic/kibana-security
create_pr "chore/lazy-plugin-import-kibana-security" \
  "chore: lazy-load server plugin modules (kibana-security)" \
  "- \`examples/eso_model_version_example\` → @elastic/kibana-security
- \`packages/kbn-mock-idp-plugin\` → @elastic/kibana-security" \
  "examples/eso_model_version_example/server/index.ts" \
  "packages/kbn-mock-idp-plugin/server/index.ts"

# 2 @elastic/appex-sharedux
create_pr "chore/lazy-plugin-import-appex-sharedux" \
  "chore: lazy-load server plugin modules (appex-sharedux)" \
  "- \`src/platform/plugins/shared/navigation\` → @elastic/appex-sharedux
- \`x-pack/platform/plugins/private/feedback\` → @elastic/appex-sharedux" \
  "src/platform/plugins/shared/navigation/server/index.ts" \
  "x-pack/platform/plugins/private/feedback/server/index.ts"

# 3 @elastic/kibana-management
create_pr "chore/lazy-plugin-import-kibana-management" \
  "chore: lazy-load server plugin modules (kibana-management)" \
  "- \`data_usage\`, \`grokdebugger\`, \`reindex_service\`, \`cloud_connect\`, \`query_activity\` → @elastic/kibana-management" \
  "x-pack/platform/plugins/private/data_usage/server/index.ts" \
  "x-pack/platform/plugins/private/grokdebugger/server/config.ts" \
  "x-pack/platform/plugins/private/grokdebugger/server/index.ts" \
  "x-pack/platform/plugins/private/grokdebugger/server/plugin.ts" \
  "x-pack/platform/plugins/private/reindex_service/server/index.ts" \
  "x-pack/platform/plugins/shared/cloud_connect/server/index.ts" \
  "x-pack/platform/plugins/shared/query_activity/server/index.ts"

# 4 @elastic/appex-ai-infra
create_pr "chore/lazy-plugin-import-appex-ai-infra" \
  "chore: lazy-load server plugin modules (appex-ai-infra)" \
  "- \`gen_ai_settings\`, \`llm_tasks\`, \`product_doc_base\`, \`dashboard_agent\` → @elastic/appex-ai-infra" \
  "x-pack/platform/plugins/private/gen_ai_settings/server/index.ts" \
  "x-pack/platform/plugins/shared/ai_infra/llm_tasks/server/index.ts" \
  "x-pack/platform/plugins/shared/ai_infra/product_doc_base/server/index.ts" \
  "x-pack/platform/plugins/shared/dashboard_agent/server/index.ts"

# 5 @elastic/security-solution
create_pr "chore/lazy-plugin-import-security-solution" \
  "chore: lazy-load server plugin modules (security-solution)" \
  "- \`indices_metadata\` → @elastic/security-solution" \
  "x-pack/platform/plugins/private/indices_metadata/server/index.ts"

# 6 @elastic/workchat-eng
create_pr "chore/lazy-plugin-import-workchat-eng" \
  "chore: lazy-load server plugin modules (workchat-eng)" \
  "- \`agent_builder\`, \`agent_builder_platform\` → @elastic/workchat-eng" \
  "x-pack/platform/plugins/shared/agent_builder/server/index.ts" \
  "x-pack/platform/plugins/shared/agent_builder_platform/server/index.ts"

# 7 @elastic/search-kibana (+ workplace co-owned)
create_pr "chore/lazy-plugin-import-search-kibana" \
  "chore: lazy-load server plugin modules (search-kibana)" \
  "- \`content_connectors\`, \`inference\`, \`search_assistant\`, \`serverless_search\` → @elastic/search-kibana
- \`workplace_ai_app\` → @elastic/search-kibana @elastic/workchat-eng" \
  "x-pack/platform/plugins/shared/content_connectors/server/index.ts" \
  "x-pack/platform/plugins/shared/inference/server/index.ts" \
  "x-pack/solutions/search/plugins/search_assistant/server/index.ts" \
  "x-pack/solutions/search/plugins/serverless_search/server/index.ts" \
  "x-pack/solutions/workplaceai/plugins/workplace_ai_app/server/index.ts"

# 8 @elastic/obs-elastic-brain-team
create_pr "chore/lazy-plugin-import-obs-elastic-brain" \
  "chore: lazy-load server plugin modules (obs-elastic-brain-team)" \
  "- \`elastic_console\` → @elastic/obs-elastic-brain-team" \
  "x-pack/platform/plugins/shared/elastic_console/server/index.ts"

# 9 @elastic/core-analysis
create_pr "chore/lazy-plugin-import-core-analysis" \
  "chore: lazy-load server plugin modules (core-analysis)" \
  "- \`entity_manager\` → @elastic/core-analysis" \
  "x-pack/platform/plugins/shared/entity_manager/server/config.ts" \
  "x-pack/platform/plugins/shared/entity_manager/server/index.ts" \
  "x-pack/platform/plugins/shared/entity_manager/server/plugin.ts"

# 10 evals — dual codeowners
create_pr "chore/lazy-plugin-import-evals" \
  "chore: lazy-load server plugin modules (evals)" \
  "- \`evals\` → @elastic/obs-ai-team @elastic/security-generative-ai" \
  "x-pack/platform/plugins/shared/evals/server/index.ts"

# 11 streams — dual codeowners
create_pr "chore/lazy-plugin-import-streams" \
  "chore: lazy-load server plugin modules (streams)" \
  "- \`streams\`, \`streams_app\` → @elastic/obs-onboarding-team @elastic/obs-sig-events-team" \
  "x-pack/platform/plugins/shared/streams/server/config.ts" \
  "x-pack/platform/plugins/shared/streams/server/index.ts" \
  "x-pack/platform/plugins/shared/streams/server/plugin.ts" \
  "x-pack/platform/plugins/shared/streams_app/server/index.ts"

# 12 @elastic/obs-presentation-team (apm)
create_pr "chore/lazy-plugin-import-obs-presentation-apm" \
  "chore: lazy-load server plugin modules (apm)" \
  "- \`apm\` → @elastic/obs-presentation-team" \
  "x-pack/solutions/observability/plugins/apm/server/index.ts"

# 13 @elastic/obs-ai-team (observability agent builder)
create_pr "chore/lazy-plugin-import-obs-ai-o11y-agent-builder" \
  "chore: lazy-load server plugin modules (observability_agent_builder)" \
  "- \`observability_agent_builder\` → @elastic/obs-ai-team" \
  "x-pack/solutions/observability/plugins/observability_agent_builder/server/index.ts"

git checkout main --quiet
echo "Done. WIP branch $WIP retained for reference."
