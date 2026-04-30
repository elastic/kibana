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

// Pool of candidate zones in the largest GCP regions for n2-standard-4 spot.
// Each entry carries the metadata needed to score it at pipeline-generation time.
//   capacityPct — region's share of all GCP public IPs (proxy for excess capacity)
//   utcOffset  — representative UTC offset (ignores DST; ±1 h doesn't shift peaks meaningfully)
interface SpotZoneEntry {
  zone: string;
  capacityPct: number;
  utcOffset: number;
}

const SPOT_ZONE_POOL: SpotZoneEntry[] = [
  // US regions — together ~46% of all GCP capacity, spot $0.057/hr
  { zone: 'us-central1-a', capacityPct: 30.1, utcOffset: -6 },
  { zone: 'us-central1-f', capacityPct: 30.1, utcOffset: -6 },
  { zone: 'us-east1-b', capacityPct: 8.3, utcOffset: -5 },
  { zone: 'us-east1-c', capacityPct: 8.3, utcOffset: -5 },
  { zone: 'us-west1-a', capacityPct: 7.5, utcOffset: -8 },
  { zone: 'us-west1-b', capacityPct: 7.5, utcOffset: -8 },
  // EU regions — together ~12% of GCP capacity, spot $0.032–$0.074/hr
  { zone: 'europe-west1-b', capacityPct: 7.1, utcOffset: 1 },
  { zone: 'europe-west1-c', capacityPct: 7.1, utcOffset: 1 },
  { zone: 'europe-west4-a', capacityPct: 4.9, utcOffset: 1 },
  { zone: 'europe-west4-b', capacityPct: 4.9, utcOffset: 1 },
  // Asia regions — together ~5.5% of GCP capacity, spot $0.059–$0.060/hr
  // Opposite timezone to US: deep off-peak when US devs are working.
  { zone: 'asia-east1-a', capacityPct: 3.0, utcOffset: 8 },
  { zone: 'asia-east1-b', capacityPct: 3.0, utcOffset: 8 },
  { zone: 'asia-northeast1-a', capacityPct: 2.5, utcOffset: 9 },
  { zone: 'asia-northeast1-b', capacityPct: 2.5, utcOffset: 9 },
];

const MIN_ZONES = 6;
const INCLUSION_SCORE_RATIO = 0.5;

// Score a zone by how much excess spot capacity it is likely to have right now.
// Higher score = deeper off-peak + larger region = lower preemption risk.
const scoreZone = (entry: SpotZoneEntry, utcHour: number, isWeekend: boolean): number => {
  const localHour = ((utcHour + entry.utcOffset) % 24 + 24) % 24;

  let offPeakFactor: number;
  if (localHour >= 0 && localHour < 6) {
    offPeakFactor = 1.0; // deep night — maximum excess capacity
  } else if (localHour >= 6 && localHour < 9) {
    offPeakFactor = 0.8; // early morning — still quiet
  } else if (localHour >= 9 && localHour < 17) {
    offPeakFactor = 0.3; // business hours — peak demand
  } else if (localHour >= 17 && localHour < 21) {
    offPeakFactor = 0.6; // evening — demand tapering
  } else {
    offPeakFactor = 0.85; // late evening — approaching off-peak
  }

  const weekendBoost = isWeekend ? 1.3 : 1.0;
  return entry.capacityPct * offPeakFactor * weekendBoost;
};

// Select and order spot zones based on current time and day.
// GCP best practice: "nights and weekends are the best times to run large
// clusters of Spot VMs." We score every candidate zone by
// regionCapacity × offPeakFactor × weekendBoost, then pick at least
// MIN_ZONES and any additional zone scoring within INCLUSION_SCORE_RATIO
// of the cutoff — so the list naturally grows when multiple regions are
// off-peak simultaneously (e.g. weekday night in the US → EU still
// qualifies) and shrinks when few zones have excess capacity.
const getOptimalSpotZones = (now: Date = new Date()): string => {
  const utcHour = now.getUTCHours();
  const dayOfWeek = now.getUTCDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const scored = SPOT_ZONE_POOL.map((entry) => ({
    zone: entry.zone,
    score: scoreZone(entry, utcHour, isWeekend),
  })).sort((a, b) => b.score - a.score);

  const cutoffScore = scored[MIN_ZONES - 1].score * INCLUSION_SCORE_RATIO;
  const selected = scored.filter((z, i) => i < MIN_ZONES || z.score >= cutoffScore);

  return selected.map((z) => z.zone).join(',');
};

const expandAgentQueue = (queueName: string = 'n2-4-spot', diskSizeGb?: number) => {
  const [kind, cores, addition] = queueName.split('-');
  const zonesToUse = getOptimalSpotZones();
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

export { getAgentImageConfig, expandAgentQueue, getOptimalSpotZones, SPOT_ZONE_POOL };
