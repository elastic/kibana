/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSelectionAsFieldType } from '../../../../../common/options_list';
import type { initializeEditorStateManager } from '../editor_state_manager';
import { OptionsListStrings } from '../options_list_strings';
import type { initializeSelectionsManager } from '../selections_manager';
import type { initializeTemporayStateManager } from '../temporay_state_manager';
import type { OptionsListControlApi } from '../types';

export const deselectOption = ({
  api,
  selectionsManager,
  temporaryStateManager,
  key,
}: {
  api: OptionsListControlApi;
  selectionsManager: ReturnType<typeof initializeSelectionsManager>;
  temporaryStateManager: ReturnType<typeof initializeTemporayStateManager>;
  key: string | undefined;
}) => {
  const field = api.field$.getValue();
  if (key == null || !field) {
    api.setBlockingError(new Error(OptionsListStrings.control.getInvalidSelectionMessage()));
    return;
  }

  const keyAsType = getSelectionAsFieldType(field, key);

  // delete from selections
  const selectedOptions = selectionsManager.api.selectedOptions$.getValue() ?? [];
  const itemIndex = (selectionsManager.api.selectedOptions$.getValue() ?? []).indexOf(keyAsType);
  if (itemIndex !== -1) {
    const newSelections = [...selectedOptions];
    newSelections.splice(itemIndex, 1);
    selectionsManager.api.setSelectedOptions(newSelections);
  }
  // delete from invalid selections
  const currentInvalid = temporaryStateManager.api.invalidSelections$.getValue();
  if (currentInvalid.has(keyAsType)) {
    currentInvalid.delete(keyAsType);
    temporaryStateManager.api.setInvalidSelections(new Set(currentInvalid));
  }
};

export const makeSelection = ({
  api,
  selectionsManager,
  temporaryStateManager,
  editorStateManager,
  key,
  showOnlySelected,
}: {
  api: OptionsListControlApi;
  selectionsManager: ReturnType<typeof initializeSelectionsManager>;
  temporaryStateManager: ReturnType<typeof initializeTemporayStateManager>;
  editorStateManager: ReturnType<typeof initializeEditorStateManager>;
  key: string | undefined;
  showOnlySelected: boolean | undefined;
}) => {
  const field = api.field$.getValue();
  if (key == null || !field) {
    api.setBlockingError(new Error(OptionsListStrings.control.getInvalidSelectionMessage()));
    return;
  }

  const existsSelected = Boolean(selectionsManager.api.existsSelected$.getValue());
  const selectedOptions = selectionsManager.api.selectedOptions$.getValue() ?? [];
  const singleSelect = editorStateManager.api.singleSelect$.getValue();

  // the order of these checks matters, so be careful if rearranging them
  const keyAsType = getSelectionAsFieldType(field, key);
  if (key === 'exists-option') {
    // if selecting exists, then deselect everything else
    selectionsManager.api.setExistsSelected(!existsSelected);
    if (!existsSelected) {
      selectionsManager.api.setSelectedOptions([]);
      temporaryStateManager.api.setInvalidSelections(new Set([]));
    }
  } else if (showOnlySelected || selectedOptions.includes(keyAsType)) {
    deselectOption({ api, key, selectionsManager, temporaryStateManager });
  } else if (singleSelect) {
    // replace selection
    selectionsManager.api.setSelectedOptions([keyAsType]);
    if (existsSelected) selectionsManager.api.setExistsSelected(false);
  } else {
    // select option
    if (existsSelected) selectionsManager.api.setExistsSelected(false);
    selectionsManager.api.setSelectedOptions(
      selectedOptions ? [...selectedOptions, keyAsType] : [keyAsType]
    );
  }
};

export const selectAll = ({
  api,
  selectionsManager,
  keys,
}: {
  api: OptionsListControlApi;
  selectionsManager: ReturnType<typeof initializeSelectionsManager>;
  keys: string[];
}) => {
  const field = api.field$.getValue();
  if (keys.length < 1 || !field) {
    api.setBlockingError(new Error(OptionsListStrings.control.getInvalidSelectionMessage()));
    return;
  }

  const selectedOptions = selectionsManager.api.selectedOptions$.getValue() ?? [];
  const newSelections = keys.filter((key) => !selectedOptions.includes(key as string));
  selectionsManager.api.setSelectedOptions([...selectedOptions, ...newSelections]);
};

export const deselectAll = ({
  api,
  selectionsManager,
  keys,
}: {
  api: OptionsListControlApi;
  selectionsManager: ReturnType<typeof initializeSelectionsManager>;
  keys: string[];
}) => {
  const field = api.field$.getValue();
  if (keys.length < 1 || !field) {
    api.setBlockingError(new Error(OptionsListStrings.control.getInvalidSelectionMessage()));
    return;
  }

  const selectedOptions = selectionsManager.api.selectedOptions$.getValue() ?? [];
  const remainingSelections = selectedOptions.filter((option) => !keys.includes(option as string));
  selectionsManager.api.setSelectedOptions(remainingSelections);
};

export const clearSelections = ({
  selectionsManager,
  temporaryStateManager,
}: {
  selectionsManager: ReturnType<typeof initializeSelectionsManager>;
  temporaryStateManager: ReturnType<typeof initializeTemporayStateManager>;
}) => {
  if (selectionsManager.api.selectedOptions$.getValue()?.length)
    selectionsManager.api.setSelectedOptions([]);
  if (selectionsManager.api.existsSelected$.getValue())
    selectionsManager.api.setExistsSelected(false);
  if (temporaryStateManager.api.invalidSelections$.getValue().size)
    temporaryStateManager.api.setInvalidSelections(new Set([]));
};
