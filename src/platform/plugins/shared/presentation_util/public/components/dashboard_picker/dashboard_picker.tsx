/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { debounce } from 'lodash';
import { css } from '@emotion/react';
import React, { useState, useEffect, useMemo } from 'react';

import {
  EuiText,
  useEuiTheme,
  EuiSelectable,
  EuiInputPopover,
  EuiPopoverTitle,
  EuiFieldSearch,
  EuiHighlight,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ToolbarButton } from '@kbn/shared-ux-button-toolbar';
import { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';

import { contentManagementService } from '../../services/kibana_services';

export interface DashboardPickerProps {
  onChange: (dashboard: { name: string; id: string } | null) => void;
  isDisabled: boolean;
  idsToOmit?: string[];
}

interface DashboardOption {
  label: string;
  value: string;
}

type DashboardHit = SavedObjectCommon<{ title: string }>;

export function DashboardPicker({ isDisabled, onChange, idsToOmit }: DashboardPickerProps) {
  const { euiTheme } = useEuiTheme();

  const [isLoading, setIsLoading] = useState(true);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const [dashboardHits, setDashboardHits] = useState<DashboardHit[]>([]);
  const [dashboardOptions, setDashboardOptions] = useState<DashboardOption[]>([]);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const [selectedDashboard, setSelectedDashboard] = useState<DashboardOption | null>(null);

  /**
   * Debounce the query to avoid many calls to content management.
   */
  const debouncedSetQuery = useMemo(
    () => debounce((latestQuery) => setDebouncedQuery(latestQuery), 150),
    []
  );
  useEffect(() => {
    debouncedSetQuery(query);
  }, [debouncedSetQuery, query]);

  /**
   * Run query to search for Dashboards when debounced query changes.
   */
  useEffect(() => {
    let canceled = false;

    (async () => {
      setIsLoading(true);

      const response = await contentManagementService.client.mSearch<DashboardHit>({
        contentTypes: [{ contentTypeId: 'dashboard' }],
        query: {
          text: debouncedQuery ? `${debouncedQuery}*` : undefined,
          limit: 30,
        },
      });
      if (canceled) return;
      if (response && response.hits) {
        setDashboardHits(response.hits);
      }

      setIsLoading(false);
    })();

    return () => {
      canceled = true;
    };
  }, [debouncedQuery]);

  /**
   * Format items with dashboard hits and selected option
   */
  useEffect(() => {
    setDashboardOptions(
      dashboardHits
        .filter((d) => !d.managed && !(idsToOmit ?? []).includes(d.id))
        .map((d) => ({
          value: d.id,
          label: d.attributes.title,
          checked: d.id === selectedDashboard?.value ? 'on' : undefined,
          'data-test-subj': `dashboard-picker-option-${d.attributes.title.replaceAll(' ', '-')}`,
        }))
    );
  }, [dashboardHits, idsToOmit, selectedDashboard]);

  return (
    <EuiInputPopover
      panelPaddingSize="none"
      input={
        <ToolbarButton
          isDisabled={isDisabled}
          fullWidth
          isLoading={isLoading}
          data-test-subj="open-dashboard-picker"
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          label={
            <EuiText
              size="s"
              css={css`
                color: ${selectedDashboard
                  ? euiTheme.colors.textParagraph
                  : euiTheme.colors.textDisabled};
              `}
            >
              {selectedDashboard?.label ??
                i18n.translate('presentationUtil.dashboardPicker.noDashboardOptionLabel', {
                  defaultMessage: 'Select dashboard',
                })}
            </EuiText>
          }
        />
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
    >
      <EuiPopoverTitle paddingSize="s">
        <EuiFieldSearch
          compressed
          fullWidth
          onChange={(event) => setQuery(event.target.value)}
          value={query}
          data-test-subj="dashboard-picker-search"
          placeholder={i18n.translate(
            'presentationUtil.dashboardPicker.searchDashboardPlaceholder',
            {
              defaultMessage: 'Search dashboards...',
            }
          )}
        />
      </EuiPopoverTitle>

      <EuiSelectable
        singleSelection={true}
        options={dashboardOptions}
        onChange={(newOptions, event, selected) => {
          setIsPopoverOpen(false);

          if (!selected || selected.value === selectedDashboard?.value) return;
          setSelectedDashboard(selected);
          onChange({ name: selected.label, id: selected.value });
        }}
        renderOption={(option) => <EuiHighlight search={query}>{option.label}</EuiHighlight>}
      >
        {(list) => <div>{list}</div>}
      </EuiSelectable>
    </EuiInputPopover>
  );
}

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default DashboardPicker;
