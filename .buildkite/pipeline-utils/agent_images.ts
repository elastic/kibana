/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dump } from 'js-yaml';
import type { BuildkiteAgentTargetingRule } from './buildkite';
import { BuildkiteClient } from './buildkite';
import { FIPS_VERSION, prHasFIPSLabel } from './pr_labels';

const ELASTIC_IMAGES_QA_PROJECT = 'elastic-images-qa';
const ELASTIC_IMAGES_PROD_PROJECT = 'elastic-images-prod';

// constrain AgentImageConfig to the type that doesn't have the `queue` property
const DEFAULT_AGENT_IMAGE_CONFIG: BuildkiteAgentTargetingRule = {
  provider: 'gcp',
  image: 'family/kibana-ubuntu-2404',
  imageProject: ELASTIC_IMAGES_PROD_PROJECT,
  diskSizeGb: 105,
};

const GITHUB_PR_LABELS = process.env.GITHUB_PR_LABELS ?? '';
const USE_FIPS_IMAGE_FOR_PR = process.env.TEST_ENABLE_FIPS_VERSION?.match(
  new RegExp(`^${FIPS_VERSION.TWO}|${FIPS_VERSION.THREE}$`)
);
const USE_QA_IMAGE_FOR_PR = process.env.USE_QA_IMAGE_FOR_PR?.match(/(1|true)/i);

const getFIPSImage = () => {
  let image: string;

  if (
    process.env.TEST_ENABLE_FIPS_VERSION === FIPS_VERSION.THREE ||
    prHasFIPSLabel(FIPS_VERSION.THREE)
  ) {
    image = 'family/kibana-fips-140-3-ubuntu-2404';
  } else {
    image = 'family/kibana-fips-140-2-ubuntu-2404';
  }

  return {
    provider: 'gcp',
    image,
    imageProject: ELASTIC_IMAGES_PROD_PROJECT,
    diskSizeGb: 105,
  };
};

// Narrow the return type with overloads
function getAgentImageConfig(): BuildkiteAgentTargetingRule;
function getAgentImageConfig(options: { returnYaml: true }): string;
function getAgentImageConfig({ returnYaml = false } = {}): string | BuildkiteAgentTargetingRule {
  const bk = new BuildkiteClient();
  let config: BuildkiteAgentTargetingRule;

  if (USE_FIPS_IMAGE_FOR_PR || prHasFIPSLabel()) {
    config = getFIPSImage();

    bk.setAnnotation(
      'agent image config',
      'info',
      '#### FIPS Agents Enabled<br />\nFIPS mode can produce new test failures. If you did not intend this remove ```TEST_ENABLE_FIPS_VERSION``` environment variable and/or the ```ci:enable-fips-<version>-agent``` Github label.'
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

const expandAgentQueue = (queueName: string = 'n2-4-spot', diskSizeGb?: number) => {
  const [kind, cores, addition] = queueName.split('-');
  const zonesToUse = 'southamerica-east1-c,asia-south2-a,us-central1-f';
  const additionalProps =
    {
      spot: { preemptible: true, zones: zonesToUse },
      virt: { enableNestedVirtualization: true, spotZones: zonesToUse },
    }[addition] || {};

  return {
    ...getAgentImageConfig(),
    machineType: `${kind}-standard-${cores}`,
    ...(diskSizeGb ? { diskSizeGb } : {}),
    ...additionalProps,
  };
};

export { getAgentImageConfig, expandAgentQueue };
