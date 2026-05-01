/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stringify } from 'yaml';
import type { BuildkiteAgentTargetingRule } from './buildkite';
import { BuildkiteClient } from './buildkite';
import { FIPS_VERSION, prHasFIPSLabel } from './pr_labels';

export const ELASTIC_IMAGES_QA_PROJECT = 'elastic-images-qa';
export const USE_QA_IMAGE_GH_LABEL = 'ci:use-qa-image';
export const ELASTIC_IMAGES_PROD_PROJECT = 'elastic-images-prod';
export const FIPS_140_3_IMAGE = 'family/kibana-fips-140-3-ubuntu-2404';
export const FIPS_140_2_IMAGE = 'family/kibana-fips-140-2-ubuntu-2404';

// constrain AgentImageConfig to the type that doesn't have the `queue` property
export const DEFAULT_AGENT_IMAGE_CONFIG: BuildkiteAgentTargetingRule = {
  provider: 'gcp',
  image: 'family/kibana-ubuntu-2404',
  imageProject: ELASTIC_IMAGES_PROD_PROJECT,
  diskSizeGb: 105,
};

const getFIPSImage = () => {
  let image: string;

  if (
    process.env.TEST_ENABLE_FIPS_VERSION === FIPS_VERSION.THREE ||
    prHasFIPSLabel(FIPS_VERSION.THREE)
  ) {
    image = FIPS_140_3_IMAGE;
  } else {
    image = FIPS_140_2_IMAGE;
  }

  return {
    ...DEFAULT_AGENT_IMAGE_CONFIG,
    image,
  };
};

// Narrow the return type with overloads
function getAgentImageConfig(): BuildkiteAgentTargetingRule;
function getAgentImageConfig(options: { returnYaml: true }): string;
function getAgentImageConfig({ returnYaml = false } = {}): string | BuildkiteAgentTargetingRule {
  const bk = new BuildkiteClient();
  const prLabels = process.env.GITHUB_PR_LABELS ?? '';
  const useFipsImage = process.env.TEST_ENABLE_FIPS_VERSION?.match(
    new RegExp(`^${FIPS_VERSION.TWO}|${FIPS_VERSION.THREE}$`)
  );
  const useQaImage =
    process.env.USE_QA_IMAGE_FOR_PR?.match(/(1|true)/i) || prLabels.includes(USE_QA_IMAGE_GH_LABEL);
  let config: BuildkiteAgentTargetingRule;

  if (useFipsImage || prHasFIPSLabel()) {
    config = getFIPSImage();

    bk.setAnnotation(
      'agent image config',
      'info',
      '#### FIPS Agents Enabled<br />\nFIPS mode can produce new test failures. If you did not intend this remove ```TEST_ENABLE_FIPS_VERSION``` environment variable and/or the ```ci:enable-fips-<version>-agent``` Github label.'
    );
  } else {
    config = { ...DEFAULT_AGENT_IMAGE_CONFIG };
  }

  if (useQaImage) {
    config = { ...config, imageProject: ELASTIC_IMAGES_QA_PROJECT };
  }

  if (returnYaml) {
    return stringify({ agents: config });
  }

  return config;
}

const expandAgentQueue = (queueName: string = 'n2-4-spot', diskSizeGb?: number) => {
  const [kind, cores, addition] = queueName.split('-');
  const zonesToUse =
    'asia-south2-a,asia-south2-b,asia-south2-c,northamerica-northeast2-a,northamerica-northeast2-b,northamerica-northeast2-c,southamerica-east1-a,southamerica-east1-b,southamerica-east1-c';
  const additionalProps =
    {
      spot: { preemptible: true, spotZones: zonesToUse },
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
