/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';

import { EuiFormRow, EuiRadioGroup, EuiSwitch } from '@elastic/eui';
import { DEFAULT_SEARCH_TECHNIQUE } from '@kbn/controls-constants';
import type { OptionsListDSLControlState, OptionsListSearchTechnique } from '@kbn/controls-schemas';

import { getCompatibleSearchTechniques } from '../../../../../common/options_list/suggestions_searching';
import { ControlSettingTooltipLabel } from '../../../../control_group/components/control_setting_tooltip_label';
import type { CustomOptionsComponentProps } from '../../types';
import { OptionsListStrings } from '../options_list_strings';
import { CustomOptionsAdditionalSettings } from '../../components';

const selectionOptions = [
  {
    id: 'multi',
    label: OptionsListStrings.editor.selectionTypes.multi.getLabel(),
    'data-test-subj': 'optionsListControl__multiSearchOptionAdditionalSetting',
  },
  {
    id: 'single',
    label: OptionsListStrings.editor.selectionTypes.single.getLabel(),
    'data-test-subj': 'optionsListControl__singleSearchOptionAdditionalSetting',
  },
];

const allSearchOptions = [
  {
    id: 'prefix',
    label: (
      <ControlSettingTooltipLabel
        label={OptionsListStrings.editor.searchTypes.prefix.getLabel()}
        tooltip={OptionsListStrings.editor.searchTypes.prefix.getTooltip()}
      />
    ),
    'data-test-subj': 'optionsListControl__prefixSearchOptionAdditionalSetting',
  },
  {
    id: 'wildcard',
    label: (
      <ControlSettingTooltipLabel
        label={OptionsListStrings.editor.searchTypes.wildcard.getLabel()}
        tooltip={OptionsListStrings.editor.searchTypes.wildcard.getTooltip()}
      />
    ),
    'data-test-subj': 'optionsListControl__wildcardSearchOptionAdditionalSetting',
  },
  {
    id: 'exact',
    label: (
      <ControlSettingTooltipLabel
        label={OptionsListStrings.editor.searchTypes.exact.getLabel()}
        tooltip={OptionsListStrings.editor.searchTypes.exact.getTooltip()}
      />
    ),
    'data-test-subj': 'optionsListControl__exactSearchOptionAdditionalSetting',
  },
];

export const OptionsListEditorOptions = ({
  initialState,
  field,
  updateState,
}: CustomOptionsComponentProps<OptionsListDSLControlState>) => {
  const [singleSelect, setSingleSelect] = useState<boolean>(initialState.single_select ?? false);
  const [runPastTimeout, setRunPastTimeout] = useState<boolean>(
    initialState.run_past_timeout ?? false
  );

  const [searchTechnique, setSearchTechnique] = useState<OptionsListSearchTechnique>(
    initialState.search_technique ?? DEFAULT_SEARCH_TECHNIQUE
  );

  const compatibleSearchTechniques = useMemo(
    () => getCompatibleSearchTechniques(field?.type),
    [field?.type]
  );

  const searchOptions = useMemo(() => {
    return allSearchOptions.filter((searchOption) => {
      return compatibleSearchTechniques.includes(searchOption.id as OptionsListSearchTechnique);
    });
  }, [compatibleSearchTechniques]);

  useEffect(() => {
    /**
     * when field type changes, ensure that the selected search technique is still valid;
     * if the selected search technique **isn't** valid, reset it to the default
     */
    const initialSearchTechniqueValid =
      initialState.search_technique &&
      compatibleSearchTechniques.includes(initialState.search_technique);
    const currentSearchTechniqueValid = compatibleSearchTechniques.includes(searchTechnique);

    if (initialSearchTechniqueValid) {
      // reset back to initial state if possible on field change
      setSearchTechnique(initialState.search_technique!);
      updateState({ search_technique: initialState.search_technique });
    } else if (currentSearchTechniqueValid) {
      // otherwise, if the current selection is valid, send that to the parent editor state
      updateState({ search_technique: searchTechnique });
    } else {
      // finally, if neither the initial or current search technique is valid, revert to the default
      setSearchTechnique(compatibleSearchTechniques[0]);
      updateState({ search_technique: compatibleSearchTechniques[0] });
    }

    // Note: We only want to call this when compatible search techniques changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compatibleSearchTechniques]);

  return (
    <>
      <EuiFormRow
        label={OptionsListStrings.editor.getSelectionOptionsTitle()}
        data-test-subj="optionsListControl__selectionOptionsRadioGroup"
      >
        <EuiRadioGroup
          compressed
          options={selectionOptions}
          idSelected={singleSelect ? 'single' : 'multi'}
          onChange={(id) => {
            const newSingleSelect = id === 'single';
            setSingleSelect(newSingleSelect);
            updateState({ single_select: newSingleSelect });
          }}
          name="selectionType"
        />
      </EuiFormRow>
      {compatibleSearchTechniques.length > 1 && (
        <EuiFormRow
          label={OptionsListStrings.editor.getSearchOptionsTitle()}
          data-test-subj="optionsListControl__searchOptionsRadioGroup"
        >
          <EuiRadioGroup
            compressed
            options={searchOptions}
            idSelected={searchTechnique}
            onChange={(id) => {
              const newSearchTechnique = id as OptionsListSearchTechnique;
              setSearchTechnique(newSearchTechnique);
              updateState({ search_technique: newSearchTechnique });
            }}
            name="searchTechnique"
          />
        </EuiFormRow>
      )}
      <CustomOptionsAdditionalSettings initialState={initialState} updateState={updateState}>
        <EuiSwitch
          compressed
          label={
            <ControlSettingTooltipLabel
              label={OptionsListStrings.editor.getRunPastTimeoutTitle()}
              tooltip={OptionsListStrings.editor.getRunPastTimeoutTooltip()}
            />
          }
          checked={runPastTimeout}
          onChange={() => {
            const newRunPastTimeout = !runPastTimeout;
            setRunPastTimeout(newRunPastTimeout);
            updateState({ run_past_timeout: newRunPastTimeout });
          }}
          data-test-subj={'optionsListControl__runPastTimeoutAdditionalSetting'}
        />
      </CustomOptionsAdditionalSettings>
    </>
  );
};
