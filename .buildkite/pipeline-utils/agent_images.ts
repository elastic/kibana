/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { dump } from 'js-yaml';
import { BuildkiteClient, BuildkiteCommandStep } from './buildkite';

type AgentImageConfig = BuildkiteCommandStep['agents'];

const DEFAULT_AGENT_IMAGE_CONFIG: AgentImageConfig = {
  provider: 'gcp',
  image: 'family/kibana-ubuntu-2004',
  imageProject: 'elastic-images-prod',
};

const FIPS_AGENT_IMAGE_CONFIG: AgentImageConfig = {
  provider: 'gcp',
  image: 'family/kibana-fips-ubuntu-2004',
  imageProject: 'elastic-images-qa',
};

const GITHUB_PR_LABELS = process.env.GITHUB_PR_LABELS ?? '';
const FTR_ENABLE_FIPS_AGENT = process.env.FTR_ENABLE_FIPS_AGENT?.toLowerCase() === 'true';

// Narrow the return type with overloads
function getAgentImageConfig(): AgentImageConfig;
function getAgentImageConfig(options: { returnYaml: true }): string;
function getAgentImageConfig({ returnYaml = false } = {}): string | AgentImageConfig {
  const bk = new BuildkiteClient();
  let config: AgentImageConfig;

  if (FTR_ENABLE_FIPS_AGENT || GITHUB_PR_LABELS.includes('ci:enable-fips-agent')) {
    config = FIPS_AGENT_IMAGE_CONFIG;

    bk.setAnnotation(
      'agent image config',
      'info',
      '#### FIPS Agents Enabled<br />\nFIPS mode can produce new test failures. If you did not intend this remove ```KBN_ENABLE_FIPS``` environment variable and/or the ```ci:enable-fips-agent``` Github label.'
    );
  } else {
    config = DEFAULT_AGENT_IMAGE_CONFIG;
  }

  if (returnYaml) {
    return dump({ agents: config });
  }

  return config;
}

export { getAgentImageConfig };
