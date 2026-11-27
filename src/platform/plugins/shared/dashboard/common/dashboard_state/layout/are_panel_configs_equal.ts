/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { asyncForEach } from '@kbn/std';
import { areComparatorsEqual, type StateComparators } from '@kbn/presentation-publishing';
import type { deserializeLayout } from './deserialize_layout';

export type GetComparators = (
  type: string,
  embeddableState: object
) => Promise<StateComparators<object> | undefined>;

type DeserializedLayout = ReturnType<typeof deserializeLayout>;

async function areConfigsEqual(
  getComparators: GetComparators,
  type: string,
  baselineConfig: object,
  currentConfig: object
) {
  try {
    const comparators = await getComparators(type, currentConfig);
    return comparators
      ? areComparatorsEqual(comparators, baselineConfig, currentConfig)
      : deepEqual(baselineConfig, currentConfig);
  } catch (error) {
    // A failed comparison cannot establish equality.
    return false;
  }
}

/**
 * Checks whether the config of every panel is equal.
 *
 * @returns `true` when every panel has the same type and an equal config.
 */
export async function arePanelConfigsEqual(
  baseline: DeserializedLayout,
  current: DeserializedLayout,
  getComparators: GetComparators
): Promise<boolean> {
  // asyncForEach callbacks run concurrently, so the flag is only ever set to false
  let isEqual = true;
  await asyncForEach(Object.entries(current.layout.panels), async ([id, { type }]) => {
    if (!isEqual) return;
    const isPanelEqual =
      baseline.layout.panels[id].type === type &&
      (await areConfigsEqual(
        getComparators,
        type,
        baseline.childState[id],
        current.childState[id]
      ));
    if (!isPanelEqual) isEqual = false;
  });
  return isEqual;
}

/**
 * Checks whether the config of every pinned panel is equal.
 *
 * @returns `true` when every pinned panel has an equal config.
 */
export async function arePinnedPanelConfigsEqual(
  baseline: DeserializedLayout,
  current: DeserializedLayout,
  getComparators: GetComparators
): Promise<boolean> {
  // asyncForEach callbacks run concurrently, so the flag is only ever set to false
  let isEqual = true;
  await asyncForEach(Object.entries(current.layout.pinnedPanels), async ([id, { type }]) => {
    if (!isEqual) return;
    const isPinnedPanelEqual = await areConfigsEqual(
      getComparators,
      type,
      baseline.childState[id],
      current.childState[id]
    );
    if (!isPinnedPanelEqual) isEqual = false;
  });
  return isEqual;
}
