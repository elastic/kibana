/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiSelectable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiButtonIcon,
  type EuiSelectableListProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

interface DataSourcesListProps {
  // List of all available data sources
  sourcesList: string[];
  // Callback when the selected data sources change
  onChangeDatasources: (newId: string[]) => void;
  // Currently selected data sources
  currentSources: string[];
}

interface DataSourceOption {
  key?: string;
  label: string;
  value?: string;
  checked?: 'on' | 'off' | undefined;
}

export function DataSourcesList({
  sourcesList,
  onChangeDatasources,
  currentSources,
}: DataSourcesListProps) {
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  const filterToggleAriaLabel = useMemo(() => {
    return showOnlySelected
      ? i18n.translate('esqlEditor.visor.showSelectedOptionsAriaLabel', {
          defaultMessage: 'Show selected options',
        })
      : i18n.translate('esqlEditor.visor.showAllOptionsAriaLabel', {
          defaultMessage: 'Show all options',
        });
  }, [showOnlySelected]);

  const onChoicesChange = useCallback(
    (choices: EuiSelectableListProps<DataSourceOption>['options']) => {
      const selectedChoices = choices.filter(({ checked }) => checked) as unknown as {
        value: string;
      }[];
      const newSelectedValues = selectedChoices.map((choice) => choice.value);

      // Prevent deselecting the last remaining source
      if (newSelectedValues.length === 0 && currentSources.length === 1) {
        return;
      }

      // I am doing this to preserve the order of existing selections and append new ones at the end
      const orderedSelections = [
        ...currentSources.filter((source) => newSelectedValues.includes(source)),
        ...newSelectedValues.filter((value) => !currentSources.includes(value)),
      ];

      onChangeDatasources(orderedSelections);
    },
    [currentSources, onChangeDatasources]
  );

  const options: DataSourceOption[] = useMemo(() => {
    return sourcesList
      ?.filter((source) => (showOnlySelected ? currentSources?.includes(source) : true))
      ?.map((source) => ({
        key: source,
        label: source,
        value: source,
        checked: currentSources?.includes(source) ? ('on' as const) : undefined,
      }));
  }, [sourcesList, showOnlySelected, currentSources]);

  const onFilterToggleClick = useCallback(() => {
    setShowOnlySelected((prev) => !prev);
  }, []);

  return (
    <EuiSelectable<DataSourceOption>
      listProps={{
        truncationProps: {
          truncation: 'middle',
        },
      }}
      data-test-subj="esqlEditor-datasourcesList-switcher"
      searchable
      options={options}
      onChange={onChoicesChange}
      searchProps={{
        id: 'visorSearchListId',
        compressed: true,
        placeholder: i18n.translate('esqlEditor.visor.searchSourcesPlaceholder', {
          defaultMessage: 'Search',
        }),
        autoFocus: false,
        inputRef: (ref) => {
          ref?.focus({ preventScroll: true });
        },
      }}
    >
      {(list, search) => (
        <>
          <EuiPanel
            css={css`
              padding-bottom: 0;
            `}
            color="transparent"
            paddingSize="s"
          >
            <EuiFlexGroup
              gutterSize="xs"
              direction="row"
              justifyContent="spaceBetween"
              alignItems="center"
              responsive={false}
            >
              <EuiFlexItem>{search}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  size="xs"
                  iconType="list"
                  aria-pressed={showOnlySelected}
                  color={showOnlySelected ? 'primary' : 'text'}
                  display={showOnlySelected ? 'base' : 'empty'}
                  onClick={onFilterToggleClick}
                  aria-label={filterToggleAriaLabel}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
          {list}
        </>
      )}
    </EuiSelectable>
  );
}
