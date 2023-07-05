/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { debounce, isEmpty } from 'lodash';
import useAsync from 'react-use/lib/useAsync';
import React, { useEffect, useMemo, useState } from 'react';

import {
  EuiBadge,
  EuiSpacer,
  EuiFlexItem,
  EuiFlexGroup,
  EuiHighlight,
  EuiSelectable,
  EuiFieldSearch,
  EuiSelectableOption,
  EuiFormRow,
  EuiFieldText,
} from '@elastic/eui';

import { DashboardItem, DashboardLinkInput } from '../types';
import { LinkEditorProps } from '../../navigation_container/types';
import { memoizedFetchDashboards } from '../lib/dashboard_editor_tools';
import { DashboardLinkEmbeddableStrings } from './dashboard_link_strings';
import { NavEmbeddableStrings } from '../../navigation_container/components/navigation_embeddable_strings';

export const DashboardLinkEditor = ({
  onChange,
  initialInput,
  currentDashboardId,
  ...other
}: LinkEditorProps<DashboardLinkInput>) => {
  const [linkLabel, setLinkLabel] = useState<string>('');
  const [searchString, setSearchString] = useState<string>('');
  const [selectedDashboard, setSelectedDashboard] = useState<DashboardItem | undefined>();
  const [dashboardListOptions, setDashboardListOptions] = useState<EuiSelectableOption[]>([]);

  const { loading: loadingDashboardList, value: dashboardList } = useAsync(async () => {
    return await memoizedFetchDashboards(searchString, undefined, currentDashboardId);
  }, [searchString]);

  useEffect(() => {
    const dashboardOptions =
      (dashboardList ?? []).map((dashboard: DashboardItem) => {
        return {
          data: dashboard,
          label: dashboard.attributes.title,
        } as EuiSelectableOption;
      }) ?? [];

    setDashboardListOptions(dashboardOptions);
  }, [dashboardList, searchString]);

  const debouncedOnChange = useMemo(
    () =>
      debounce((newInput: Partial<DashboardLinkInput>, valid: boolean) => {
        onChange(newInput, valid);
      }),
    [onChange]
  );

  useEffect(() => {
    if (selectedDashboard) {
      debouncedOnChange(
        !isEmpty(linkLabel)
          ? { dashboardId: selectedDashboard.id, label: linkLabel }
          : { dashboardId: selectedDashboard.id },
        true
      );
    } else {
      debouncedOnChange({}, false);
    }
  }, [selectedDashboard, linkLabel, debouncedOnChange]);

  return (
    <>
      <EuiFormRow label={NavEmbeddableStrings.editor.linkEditor.getLinkDestinationLabel()}>
        {/* {...other} is needed so all inner elements are treated as part of the form */}
        <div {...other}>
          <EuiFieldSearch
            isClearable={true}
            placeholder={DashboardLinkEmbeddableStrings.getSearchPlaceholder()}
            onSearch={(value) => {
              setSearchString(value);
            }}
          />
          <EuiSpacer size="s" />
          <EuiSelectable
            aria-label={DashboardLinkEmbeddableStrings.getDashboardPickerAriaLabel()}
            singleSelection={true}
            options={dashboardListOptions}
            isLoading={loadingDashboardList}
            onChange={(newOptions, _, selected) => {
              if (selected.checked) {
                setSelectedDashboard(selected.data as DashboardItem);
              } else {
                setSelectedDashboard(undefined);
              }
              setDashboardListOptions(newOptions);
            }}
            listProps={{ onFocusBadge: false, bordered: true, isVirtualized: true }}
            renderOption={(option) => {
              return (
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiHighlight search={searchString}>{option.label}</EuiHighlight>
                  </EuiFlexItem>
                  {option.id === currentDashboardId && (
                    <EuiFlexItem grow={false}>
                      <EuiBadge>
                        {DashboardLinkEmbeddableStrings.getCurrentDashboardLabel()}
                      </EuiBadge>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              );
            }}
          >
            {(list) => list}
          </EuiSelectable>
        </div>
      </EuiFormRow>
      <EuiFormRow label={NavEmbeddableStrings.editor.linkEditor.getLinkTextLabel()}>
        <EuiFieldText
          placeholder={NavEmbeddableStrings.editor.linkEditor.getLinkTextPlaceholder()}
          value={linkLabel}
          onChange={(e) => {
            setLinkLabel(e.target.value);
          }}
        />
      </EuiFormRow>

      {/* TODO: As part of https://github.com/elastic/kibana/issues/154381, we should pull in the custom settings for each link type.
            Refer to `x-pack/examples/ui_actions_enhanced_examples/public/drilldowns/dashboard_to_discover_drilldown/collect_config_container.tsx`
            for the dashboard drilldown settings, for example. 

            Open question: It probably makes sense to re-use these components so any changes made to the drilldown architecture
            trickle down to the navigation embeddable - this would require some refactoring, though. Is this a goal for MVP?
         */}
    </>
  );
};
