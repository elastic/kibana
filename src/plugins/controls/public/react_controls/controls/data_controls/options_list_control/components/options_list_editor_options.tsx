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
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';

import {
  getCompatibleSearchTechniques,
  OptionsListSearchTechnique,
} from '../../../../../../common/options_list/suggestions_searching';
import { ControlSettingTooltipLabel } from '../../../../control_group/components/control_setting_tooltip_label';
import { CustomOptionsComponentProps } from '../../types';
import { DEFAULT_SEARCH_TECHNIQUE } from '../constants';
import { OptionsListStrings } from '../options_list_strings';
import { OptionsListControlState } from '../types';

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
  controlGroupApi,
}: CustomOptionsComponentProps<OptionsListControlState>) => {
  const allowExpensiveQueries = useStateFromPublishingSubject(
    controlGroupApi.allowExpensiveQueries$
  );

  const [singleSelect, setSingleSelect] = useState<boolean>(initialState.singleSelect ?? false);
  const [runPastTimeout, setRunPastTimeout] = useState<boolean>(
    initialState.runPastTimeout ?? false
  );
  const [searchTechnique, setSearchTechnique] = useState<OptionsListSearchTechnique>(
    initialState.searchTechnique ?? DEFAULT_SEARCH_TECHNIQUE
  );

  const compatibleSearchTechniques = useMemo(
    () => getCompatibleSearchTechniques(field.type),
    [field.type]
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
      initialState.searchTechnique &&
      compatibleSearchTechniques.includes(initialState.searchTechnique);
    const currentSearchTechniqueValid = compatibleSearchTechniques.includes(searchTechnique);

    if (initialSearchTechniqueValid) {
      // reset back to initial state if possible on field change
      setSearchTechnique(initialState.searchTechnique!);
      updateState({ searchTechnique: initialState.searchTechnique });
    } else if (currentSearchTechniqueValid) {
      // otherwise, if the current selection is valid, send that to the parent editor state
      updateState({ searchTechnique });
    } else {
      // finally, if neither the initial or current search technique is valid, revert to the default
      setSearchTechnique(compatibleSearchTechniques[0]);
      updateState({ searchTechnique: compatibleSearchTechniques[0] });
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
          options={selectionOptions}
          idSelected={singleSelect ? 'single' : 'multi'}
          onChange={(id) => {
            const newSingleSelect = id === 'single';
            setSingleSelect(newSingleSelect);
            updateState({ singleSelect: newSingleSelect });
          }}
        />
      </EuiFormRow>
      {allowExpensiveQueries && compatibleSearchTechniques.length > 1 && (
        <EuiFormRow
          label={OptionsListStrings.editor.getSearchOptionsTitle()}
          data-test-subj="optionsListControl__searchOptionsRadioGroup"
        >
          <EuiRadioGroup
            options={searchOptions}
            idSelected={searchTechnique}
            onChange={(id) => {
              const newSearchTechnique = id as OptionsListSearchTechnique;
              setSearchTechnique(newSearchTechnique);
              updateState({ searchTechnique: newSearchTechnique });
            }}
          />
        </EuiFormRow>
      )}
      <EuiFormRow label={OptionsListStrings.editor.getAdditionalSettingsTitle()}>
        <EuiSwitch
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
            updateState({ runPastTimeout: newRunPastTimeout });
          }}
          data-test-subj={'optionsListControl__runPastTimeoutAdditionalSetting'}
        />
      </EuiFormRow>
    </>
  );
};
