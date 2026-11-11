/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Fs from 'fs';

import type { BuildkiteClient } from '../../buildkite/index.ts';
import type { OnMergeSelection, OnMergeTestTypeDecision } from '../../on-merge/selection.ts';
import {
  ON_MERGE_SELECTION_METADATA_KEY,
  parseOnMergeSelection,
} from '../../on-merge/selection.ts';
import { resolveSelectiveTestingChanges } from './selective_changes.ts';
import { getFtrSkipModules } from './selective_ftr.ts';
import { isScoutPathOnlyDiff } from './selective_scout.ts';
import {
  filterJestIntegrationConfigsByAffected,
  filterJestUnitConfigsByAffected,
  resolveSelectiveTestingContext,
} from './selective_testing.ts';

export const ON_MERGE_SHADOW_ARTIFACT = 'on_merge_selection_shadow_jest_ftr.json';

interface ShadowTestTypeResult {
  decision: OnMergeTestTypeDecision;
  total: number;
  selected: number;
}

export interface OnMergeShadowResult {
  commit: string;
  base: string | null;
  changedFiles: number | null;
  jestUnit: ShadowTestTypeResult & { selectedConfigs: string[] };
  jestIntegration: ShadowTestTypeResult & { selectedConfigs: string[] };
  ftr: ShadowTestTypeResult & { skipModules: string[] | null };
}

interface ShadowConfigs {
  jestUnitConfigs: string[];
  jestIntegrationConfigs: string[];
  ftrConfigCount: number;
}

/** Computes which Jest/FTR configs the on-merge selection would run, without changing the build. */
export async function computeOnMergeShadow(
  selection: OnMergeSelection,
  { jestUnitConfigs, jestIntegrationConfigs, ftrConfigCount }: ShadowConfigs
): Promise<OnMergeShadowResult> {
  const { base, testTypes } = selection;
  const unitSelective = testTypes.jestUnit.mode === 'selective';
  const integrationSelective = testTypes.jestIntegration.mode === 'selective';
  const ftrSelective = testTypes.ftr.mode === 'selective';

  const changedFiles =
    base && (unitSelective || integrationSelective || ftrSelective)
      ? resolveSelectiveTestingChanges(base, 'on-merge')
      : null;

  let selectedUnit = jestUnitConfigs;
  let selectedIntegration = jestIntegrationConfigs;
  let ftrSkipModules: string[] | null = null;

  if (changedFiles !== null && isScoutPathOnlyDiff(changedFiles)) {
    if (unitSelective) selectedUnit = [];
    if (integrationSelective) selectedIntegration = [];
    if (ftrSelective) ftrSkipModules = [];
  } else if (changedFiles !== null) {
    if (ftrSelective) {
      ftrSkipModules = await getFtrSkipModules(changedFiles);
    }
    const selectiveCtx =
      unitSelective || integrationSelective
        ? await resolveSelectiveTestingContext(changedFiles)
        : null;
    if (selectiveCtx !== null) {
      if (unitSelective) {
        selectedUnit = filterJestUnitConfigsByAffected(jestUnitConfigs, selectiveCtx);
      }
      if (integrationSelective) {
        selectedIntegration = filterJestIntegrationConfigsByAffected(
          jestIntegrationConfigs,
          selectiveCtx
        );
      }
    }
  }

  return {
    commit: selection.commit,
    base,
    changedFiles: changedFiles?.length ?? null,
    jestUnit: {
      decision: testTypes.jestUnit,
      total: jestUnitConfigs.length,
      selected: selectedUnit.length,
      selectedConfigs: selectedUnit,
    },
    jestIntegration: {
      decision: testTypes.jestIntegration,
      total: jestIntegrationConfigs.length,
      selected: selectedIntegration.length,
      selectedConfigs: selectedIntegration,
    },
    ftr: {
      decision: testTypes.ftr,
      total: ftrConfigCount,
      selected: ftrSkipModules === null ? ftrConfigCount : 0,
      skipModules: ftrSkipModules,
    },
  };
}

const formatTestType = (
  name: string,
  { decision, total, selected }: ShadowTestTypeResult
): string =>
  `- ${name}: ${selected}/${total} configs${
    decision.mode === 'full' ? ` (full: ${decision.reason})` : ''
  }`;

/** Records the on-merge shadow selection for Jest/FTR as an artifact and annotation; never throws. */
export async function recordOnMergeShadow(
  bk: BuildkiteClient,
  configs: ShadowConfigs
): Promise<void> {
  try {
    const selection = parseOnMergeSelection(bk.getMetadata(ON_MERGE_SELECTION_METADATA_KEY));
    if (!selection) {
      console.log('On-merge shadow: no selection recorded by Pre-Build, skipping');
      return;
    }

    const result = await computeOnMergeShadow(selection, configs);
    Fs.writeFileSync(ON_MERGE_SHADOW_ARTIFACT, JSON.stringify(result, null, 2));
    bk.uploadArtifacts(ON_MERGE_SHADOW_ARTIFACT);
    bk.setAnnotation(
      'on-merge-selective-shadow-jest-ftr',
      'info',
      [
        `On-merge selective testing (shadow) for Jest/FTR — ${
          result.changedFiles ?? 'n/a'
        } changed file(s); all configs still run:`,
        '',
        formatTestType('Jest unit', result.jestUnit),
        formatTestType('Jest integration', result.jestIntegration),
        formatTestType('FTR', result.ftr),
      ].join('\n')
    );
  } catch (error) {
    console.error('On-merge shadow selection failed (ignored)', error);
  }
}
