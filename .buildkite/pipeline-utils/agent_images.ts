/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dump } from 'js-yaml';
import { BuildkiteClient, BuildkiteAgentTargetingRule } from './buildkite';

const ELASTIC_IMAGES_QA_PROJECT = 'elastic-images-qa';
const ELASTIC_IMAGES_PROD_PROJECT = 'elastic-images-prod';

// constrain AgentImageConfig to the type that doesn't have the `queue` property
const DEFAULT_AGENT_IMAGE_CONFIG: BuildkiteAgentTargetingRule = {
  provider: 'gcp',
  image: 'family/kibana-ubuntu-2004',
  imageProject: ELASTIC_IMAGES_PROD_PROJECT,
};

const FIPS_AGENT_IMAGE_CONFIG: BuildkiteAgentTargetingRule = {
  provider: 'gcp',
  image: 'family/kibana-fips-ubuntu-2004',
  imageProject: ELASTIC_IMAGES_PROD_PROJECT,
};

const GITHUB_PR_LABELS = process.env.GITHUB_PR_LABELS ?? '';
const FTR_ENABLE_FIPS_AGENT = process.env.FTR_ENABLE_FIPS_AGENT?.toLowerCase() === 'true';
const USE_QA_IMAGE_FOR_PR = process.env.USE_QA_IMAGE_FOR_PR?.match(/(1|true)/i);

// Narrow the return type with overloads
function getAgentImageConfig(): BuildkiteAgentTargetingRule;
function getAgentImageConfig(options: { returnYaml: true }): string;
function getAgentImageConfig({ returnYaml = false } = {}): string | BuildkiteAgentTargetingRule {
  const bk = new BuildkiteClient();
  let config: BuildkiteAgentTargetingRule;

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

  if (USE_QA_IMAGE_FOR_PR || GITHUB_PR_LABELS.includes('ci:use-qa-image')) {
    config.imageProject = ELASTIC_IMAGES_QA_PROJECT;
  }

  if (returnYaml) {
    return dump({ agents: config });
  }

  return config;
}

const expandAgentQueue = (queueName: string = 'n2-4-spot') => {
  const [kind, cores, addition] = queueName.split('-');
  const additionalProps =
    {
      spot: { preemptible: true },
      virt: { enableNestedVirtualization: true },
    }[addition] || {};

  return {
    ...getAgentImageConfig(),
    machineType: `${kind}-standard-${cores}`,
    ...additionalProps,
  };
};

export { getAgentImageConfig, expandAgentQueue };
