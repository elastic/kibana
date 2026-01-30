/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { UseEuiTheme } from '@elastic/eui';
import { EuiFieldSearch, EuiHighlight, EuiSelectable, EuiSpacer, useEuiTheme } from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import { UserAvatar, getUserDisplayName } from '@kbn/user-profile-components';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';

import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { OptionsListSelection } from '@kbn/controls-schemas';
import type { OptionsListSuggestions } from '../../../../../common/options_list/types';
import { MAX_OPTIONS_LIST_REQUEST_SIZE, NO_ASSIGNEES_OPTION_KEY } from '../constants';
import {
  bulkGetUserProfilesWithAvatar,
  getCachedUserProfileWithAvatar,
  suggestUserProfilesWithAvatar,
} from '../utils/user_profile_lookup';
import { useOptionsListContext } from '../options_list_context_provider';
import { OptionsListStrings } from '../options_list_strings';
import { OptionsListPopoverEmptyMessage } from './options_list_popover_empty_message';
import { OptionsListPopoverSuggestionBadge } from './options_list_popover_suggestion_badge';

interface OptionsListPopoverSuggestionsProps {
  showOnlySelected: boolean;
}

export const OptionsListPopoverSuggestions = ({
  showOnlySelected,
}: OptionsListPopoverSuggestionsProps) => {
  const {
    componentApi,
    displaySettings: { hide_exists },
  } = useOptionsListContext();

  const { euiTheme } = useEuiTheme();
  const styles = useMemoCss(optionListPopoverSuggestionsStyles);

  const [
    sort,
    searchString,
    existsSelected,
    searchTechnique,
    selectedOptions,
    fieldName,
    invalidSelections,
    availableOptions,
    totalCardinality,
    loading,
    fieldFormatter,
    allowExpensiveQueries,
  ] = useBatchedPublishingSubjects(
    componentApi.sort$,
    componentApi.searchString$,
    componentApi.existsSelected$,
    componentApi.searchTechnique$,
    componentApi.selectedOptions$,
    componentApi.fieldName$,
    componentApi.invalidSelections$,
    componentApi.availableOptions$,
    componentApi.totalCardinality$,
    componentApi.dataLoading$,
    componentApi.fieldFormatter,
    componentApi.allowExpensiveQueries$
  );

  const listRef = useRef<HTMLDivElement>(null);

  const canLoadMoreSuggestions = useMemo<boolean>(
    () =>
      allowExpensiveQueries && totalCardinality && !showOnlySelected // && searchString.valid
        ? (availableOptions ?? []).length <
          Math.min(totalCardinality, MAX_OPTIONS_LIST_REQUEST_SIZE)
        : false,
    [availableOptions, totalCardinality, showOnlySelected, allowExpensiveQueries]
  );

  const isAssigneeField = fieldName === 'kibana.alert.workflow_assignee_ids';
  const [assigneeSuggestedUids, setAssigneeSuggestedUids] = useState<string[]>([]);
  const [assigneeProfilesVersion, setAssigneeProfilesVersion] = useState(0);
  const [assigneeSuggestStatus, setAssigneeSuggestStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [selectableOptions, setSelectableOptions] = useState<EuiSelectableOption[]>([]); // set in following useEffect

  const suggestions = useMemo<OptionsListSuggestions | OptionsListSelection[]>(() => {
    // For assignees, reuse the action bar search input as a user search term.
    if (isAssigneeField && searchString?.trim() && assigneeSuggestStatus === 'success') {
      return assigneeSuggestedUids.map((uid) => ({ value: uid }));
    }
    return (showOnlySelected ? selectedOptions : availableOptions) ?? [];
  }, [
    availableOptions,
    selectedOptions,
    showOnlySelected,
    isAssigneeField,
    searchString,
    assigneeSuggestedUids,
    assigneeSuggestStatus,
  ]);

  const visibleSelectableOptions = useMemo(() => {
    if (!isAssigneeField) return selectableOptions;
    const term = (searchString ?? '').trim().toLowerCase();
    if (!term) return selectableOptions;

    return selectableOptions.filter((option) => {
      if (option.isGroupLabel) return true;
      if (option.key === 'exists-option') return true;
      if (option.key === NO_ASSIGNEES_OPTION_KEY) return true;

      const label = typeof option.label === 'string' ? option.label : '';
      const haystack = `${label} ${String(option.key ?? '')}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [isAssigneeField, searchString, selectableOptions]);

  const suggestionUids = useMemo<string[]>(() => {
    if (!isAssigneeField) return [];
    return suggestions
      .map((suggestion) => {
        const value = typeof suggestion === 'object' ? suggestion.value : suggestion;
        return String(value);
      })
      .filter((value) => Boolean(value) && value !== NO_ASSIGNEES_OPTION_KEY);
  }, [isAssigneeField, suggestions]);

  useEffect(() => {
    if (!isAssigneeField) return;
    const term = searchString?.trim() ?? '';
    if (!term) {
      setAssigneeSuggestedUids([]);
      setAssigneeSuggestStatus('idle');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setAssigneeSuggestStatus('loading');
        const profiles = await suggestUserProfilesWithAvatar(term);
        if (cancelled) return;
        setAssigneeSuggestedUids(profiles.map((p) => p.uid));
        setAssigneeProfilesVersion((v) => v + 1);
        setAssigneeSuggestStatus('success');
      } catch {
        // best-effort: if user profiles suggest is unavailable, fall back to default suggestions
        if (!cancelled) setAssigneeSuggestStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAssigneeField, searchString]);

  useEffect(() => {
    if (!isAssigneeField) return;
    let cancelled = false;

    (async () => {
      try {
        await bulkGetUserProfilesWithAvatar(suggestionUids);
        if (!cancelled) setAssigneeProfilesVersion((v) => v + 1);
      } catch {
        // best-effort: if security/user profiles are unavailable, fall back to default rendering
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAssigneeField, suggestionUids]);

  const existsSelectableOption = useMemo<EuiSelectableOption | undefined>(() => {
    if (hide_exists || (!existsSelected && (showOnlySelected || suggestions?.length === 0))) return;

    return {
      key: 'exists-option',
      checked: existsSelected ? 'on' : undefined,
      label: OptionsListStrings.controlAndPopover.getExists(),
      css: styles.optionsListExistsFilter,
      'data-test-subj': 'optionsList-control-selection-exists',
    };
  }, [suggestions, existsSelected, showOnlySelected, hide_exists, styles]);
  useEffect(() => {
    /* This useEffect makes selectableOptions responsive to search, show only selected, and clear selections */
    const options: EuiSelectableOption[] = suggestions.map((suggestion) => {
      if (typeof suggestion !== 'object') {
        // this means that `showOnlySelected` is true, and doc count is not known when this is the case
        suggestion = { value: suggestion };
      }

      const rawValue = String(suggestion.value);
      const userProfile =
        isAssigneeField && rawValue !== NO_ASSIGNEES_OPTION_KEY
          ? getCachedUserProfileWithAvatar(rawValue)
          : undefined;
      const assigneeLabel =
        userProfile && userProfile !== null ? getUserDisplayName(userProfile.user) : undefined;

      const isNoAssignees = isAssigneeField && rawValue === NO_ASSIGNEES_OPTION_KEY;

      return {
        key: rawValue,
        label: String(
          (isNoAssignees
            ? OptionsListStrings.controlAndPopover.getNoAssignees()
            : isAssigneeField
            ? assigneeLabel
            : undefined) ??
            fieldFormatter(suggestion.value) ??
            suggestion.value
        ),
        checked: (selectedOptions ?? []).includes(suggestion.value) ? 'on' : undefined,
        'data-test-subj': `optionsList-control-selection-${suggestion.value}`,
        className:
          showOnlySelected && invalidSelections.has(suggestion.value)
            ? 'optionsList__selectionInvalid'
            : 'optionsList__validSuggestion',
        prepend: isNoAssignees ? (
          <UserAvatar size="s" />
        ) : isAssigneeField && userProfile && userProfile !== null ? (
          <UserAvatar user={userProfile.user} avatar={userProfile.data.avatar} size="s" />
        ) : undefined,
        append:
          !showOnlySelected && suggestion?.docCount ? (
            <OptionsListPopoverSuggestionBadge documentCount={suggestion.docCount} />
          ) : undefined,
      } as EuiSelectableOption;
    });

    // Special-case: allow filtering to “No assignees” even when `hideExists` is true.
    if (isAssigneeField) {
      options.unshift({
        key: NO_ASSIGNEES_OPTION_KEY,
        label: OptionsListStrings.controlAndPopover.getNoAssignees(),
        checked: (selectedOptions ?? []).includes(NO_ASSIGNEES_OPTION_KEY) ? 'on' : undefined,
        'data-test-subj': 'optionsList-control-selection-no-assignees',
      });
    }

    if (canLoadMoreSuggestions) {
      options.push({
        key: 'loading-option',
        'data-test-subj': 'optionslist--canLoadMore',
        label: OptionsListStrings.popover.getLoadingMoreMessage(),
        isGroupLabel: true,
        css: styles.loadMore,
      });
    } else if (options.length === MAX_OPTIONS_LIST_REQUEST_SIZE) {
      options.push({
        key: 'no-more-option',
        label: OptionsListStrings.popover.getAtEndOfOptionsMessage(),
        isGroupLabel: true,
        css: styles.noMoreOptions,
      });
    }
    setSelectableOptions(existsSelectableOption ? [existsSelectableOption, ...options] : options);
  }, [
    suggestions,
    availableOptions,
    showOnlySelected,
    selectedOptions,
    invalidSelections,
    existsSelectableOption,
    canLoadMoreSuggestions,
    fieldFormatter,
    isAssigneeField,
    assigneeProfilesVersion,
    styles,
  ]);

  const loadMoreOptions = useCallback(() => {
    const listbox = listRef.current?.querySelector('.euiSelectableList__list');
    if (!listbox) return;

    const { scrollTop, scrollHeight, clientHeight } = listbox;
    if (scrollTop + clientHeight >= scrollHeight - parseInt(euiTheme.size.xxl, 10)) {
      // reached the "bottom" of the list, where euiSizeXXL acts as a "margin of error" so that the user doesn't
      // have to scroll **all the way** to the bottom in order to load more options
      componentApi.setRequestSize(Math.min(totalCardinality, MAX_OPTIONS_LIST_REQUEST_SIZE));
      componentApi.loadMoreSubject.next(); // trigger refetch with loadMoreSubject
    }
  }, [componentApi, euiTheme.size.xxl, totalCardinality]);

  const renderOption = useCallback(
    (option: EuiSelectableOption, searchStringValue: string) => {
      if (!allowExpensiveQueries || searchTechnique === 'exact') return option.label;

      return (
        <EuiHighlight search={option.key === 'exists-option' ? '' : searchStringValue}>
          {option.label}
        </EuiHighlight>
      );
    },
    [searchTechnique, allowExpensiveQueries]
  );

  useEffect(() => {
    const container = listRef.current;
    if (!loading && canLoadMoreSuggestions) {
      container?.addEventListener('scroll', loadMoreOptions, true);
      return () => {
        container?.removeEventListener('scroll', loadMoreOptions, true);
      };
    }
  }, [loadMoreOptions, loading, canLoadMoreSuggestions]);

  useEffect(() => {
    // scroll back to the top when changing the sorting or the search string
    const listbox = listRef.current?.querySelector('.euiSelectableList__list');
    listbox?.scrollTo({ top: 0 });
  }, [sort, searchString]);

  return (
    <>
      {isAssigneeField && (
        <>
          <EuiFieldSearch
            compressed
            fullWidth
            value={searchString ?? ''}
            onChange={(event) => componentApi.setSearchString(event.target.value)}
            data-test-subj="optionsList-assignee-search-input"
            placeholder={OptionsListStrings.popover.getSearchPlaceholder('exact')}
            aria-label={OptionsListStrings.popover.getSearchAriaLabel(fieldName)}
          />
          <EuiSpacer size="s" />
        </>
      )}
      <div data-test-subj="optionsList--scrollListener" ref={listRef}>
        <EuiSelectable
          options={visibleSelectableOptions}
          renderOption={(option) => renderOption(option, searchString)}
          listProps={{ onFocusBadge: false }}
          aria-label={OptionsListStrings.popover.getSuggestionsAriaLabel(
            fieldName,
            visibleSelectableOptions.length
          )}
          emptyMessage={<OptionsListPopoverEmptyMessage showOnlySelected={showOnlySelected} />}
          onChange={(newSuggestions, event, changedOption) => {
            componentApi.makeSelection(changedOption.key, showOnlySelected);
          }}
        >
          {(list) => list}
        </EuiSelectable>
      </div>
    </>
  );
};

const optionListPopoverSuggestionsStyles = {
  optionsListExistsFilter: ({ euiTheme }: UseEuiTheme) => css`
    font-style: italic;
    font-weight: ${euiTheme.font.weight.medium};
  `,
  loadMore: ({ euiTheme }: UseEuiTheme) => css`
    text-align: center;
    padding: ${euiTheme.size.m};
    font-style: italic;
    height: ${euiTheme.size.xxl} !important;
  `,
  noMoreOptions: ({ euiTheme }: UseEuiTheme) =>
    css({
      textAlign: 'center',
      fontSize: euiTheme.size.m,
      height: 'auto !important',
      color: euiTheme.colors.textSubdued,
      padding: euiTheme.size.m,
    }),
};
