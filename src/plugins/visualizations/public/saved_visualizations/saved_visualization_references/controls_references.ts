/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectReference } from '../../../../../core/types';

export const extractControlsReferences = (
  visState: Record<string, any>,
  references: SavedObjectReference[] = []
) => {
  const controls = visState.params?.controls ?? [];

  controls.forEach((control: Record<string, string>, i: number) => {
    if (!control.indexPattern) {
      return;
    }
    control.indexPatternRefName = `control_${i}_index_pattern`;
    references.push({
      name: control.indexPatternRefName,
      type: 'index-pattern',
      id: control.indexPattern,
    });
    delete control.indexPattern;
  });
};

export const injectControlsReferences = (
  visState: Record<string, any>,
  references: SavedObjectReference[]
) => {
  const controls = visState.params?.controls ?? [];

  controls.forEach((control: Record<string, string>) => {
    if (!control.indexPatternRefName) {
      return;
    }
    const reference = references.find((ref) => ref.name === control.indexPatternRefName);
    if (!reference) {
      throw new Error(`Could not find index pattern reference "${control.indexPatternRefName}"`);
    }
    control.indexPattern = reference.id;
    delete control.indexPatternRefName;
  });
};
