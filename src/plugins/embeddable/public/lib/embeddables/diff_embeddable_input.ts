/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fastIsEqual from 'fast-deep-equal';
import { pick, omit } from 'lodash';
import { EmbeddableInput } from '.';

// list out the keys from the EmbeddableInput type to allow lodash to pick them later
const allGenericInputKeys: Readonly<Array<keyof EmbeddableInput>> = [
  'lastReloadRequestTime',
  'executionContext',
  'searchSessionId',
  'hidePanelTitles',
  'disabledActions',
  'disableTriggers',
  'enhancements',
  'syncColors',
  'syncTooltips',
  'viewMode',
  'title',
  'id',
] as const;

const genericInputKeysToCompare = [
  'hidePanelTitles',
  'disabledActions',
  'disableTriggers',
  'enhancements',
  'syncColors',
  'syncTooltips',
  'title',
  'id',
] as const;

// type used to ensure that only keys present in EmbeddableInput are extracted
type GenericEmbedableInputToCompare = Pick<
  EmbeddableInput,
  typeof genericInputKeysToCompare[number]
>;

export const omitGenericEmbeddableInput = <
  I extends Partial<EmbeddableInput> = Partial<EmbeddableInput>
>(
  input: I
): Omit<I, keyof EmbeddableInput> => omit(input, allGenericInputKeys);

export const genericEmbeddableInputIsEqual = (
  currentInput: Partial<EmbeddableInput>,
  lastInput: Partial<EmbeddableInput>
) => {
  const {
    title: currentTitle,
    hidePanelTitles: currentHidePanelTitles,
    ...current
  } = pick(currentInput as GenericEmbedableInputToCompare, genericInputKeysToCompare);
  const {
    title: lastTitle,
    hidePanelTitles: lastHidePanelTitles,
    ...last
  } = pick(lastInput as GenericEmbedableInputToCompare, genericInputKeysToCompare);

  if (currentTitle !== lastTitle) return false;
  if (Boolean(currentHidePanelTitles) !== Boolean(lastHidePanelTitles)) return false;
  if (!fastIsEqual(current, last)) return false;
  return true;
};
