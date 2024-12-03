
## PHASE 1 - ESLint constraints

- Manifests (plugin export function + setup + start contracts)
- Import statements
- group: 'platform' | 'observability' | 'security' | 'search'
- visibility: 'private' | 'shared'  # platform only, solutions are 'private'

## PHASE 2 - Categorising modules (packages and plugins)

- Not moving, only tagging
- Reveal inter-group dependencies


## PHASE 3 - Actually moving stuff
```
  'src/platform/(packages|plugins)/(private|shared)',
  'x-pack/platform/(packages|plugins)/(private|shared)',

  'x-pack/solutions/observability/plugins',
  'x-pack/solutions/observability/packages',
  'x-pack/solutions/security/plugins',
  'x-pack/solutions/security/packages',
  'x-pack/solutions/search/plugins',
  'x-pack/solutions/search/packages',
```

- Command-line tool to relocate modules, by owner
- 38 teams => 38 big PRs



---



















node scripts/manifest --relocate @elastic/appex-ai-infra

Manually search for [\/\\]

const TEAMS = [
  '@elastic/kibana-core',                       https://github.com/elastic/kibana/pull/201653
  '@elastic/appex-ai-infra',                    https://github.com/elastic/kibana/pull/202410
  '@elastic/appex-sharedux',                    ai-infra
  '@elastic/docs',                              https://github.com/elastic/kibana/pull/202416
  '@elastic/fleet',                             shallow-2 https://github.com/elastic/kibana/pull/202422
                          * x-pack/platform/plugins/shared/fleet/cypress/tasks/login.ts
                          * x-pack/platform/plugins/shared/fleet/cypress/reporter_config.json
  '@elastic/kibana-cloud-security-posture',
  '@elastic/kibana-data-discovery',
  '@elastic/kibana-esql',
  '@elastic/kibana-localization',
  '@elastic/kibana-management',
  '@elastic/kibana-operations',
  '@elastic/kibana-presentation',
  '@elastic/kibana-reporting-services',
  '@elastic/kibana-security',
  '@elastic/kibana-visualizations',
  '@elastic/logstash',
  '@elastic/ml-ui',
  '@elastic/obs-ai-assistant',
  '@elastic/obs-entities',
  '@elastic/obs-knowledge-team',
  '@elastic/obs-ux-infra_services-team',
  '@elastic/obs-ux-logs-team',
  '@elastic/obs-ux-management-team',
  '@elastic/obs-ux-onboarding-team',
  '@elastic/observability-ui',
  '@elastic/response-ops',
  '@elastic/search-kibana',
  '@elastic/security-asset-management',
  '@elastic/security-defend-workflows',
  '@elastic/security-detection-engine',
  '@elastic/security-detection-rule-management',
  '@elastic/security-detections-response',
  '@elastic/security-generative-ai',
  '@elastic/security-scalability',
  '@elastic/security-solution',
  '@elastic/security-threat-hunting-explore',
  '@elastic/security-threat-hunting-investigations',
  '@elastic/security-threat-hunting',
  '@elastic/stack-monitoring',
  '@simianhacker @flash1293 @dgieselaar',
  '@vigneshshanmugam',
];
