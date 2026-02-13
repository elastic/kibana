/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFieldSearch, EuiHighlight, EuiSelectable, EuiSpacer } from '@elastic/eui';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { getUserDisplayName, UserAvatar } from '@kbn/user-profile-components';
import { OptionsListStrings } from '../options_list_strings';
import { useOptionsListContext } from '../options_list_context_provider';
import { OptionsListPopoverEmptyMessage } from './options_list_popover_empty_message';
import {
  getCachedUserProfileWithAvatar,
  suggestUserProfilesWithAvatar,
} from '../utils/user_profile_lookup';

export const UsersSuggestions = memo(() => {
  const [suggestedUserIds, setSuggestedUserIds] = useState<string[]>([]);

  const { componentApi } = useOptionsListContext();
  const [fieldName, selectedOptions, searchString] = useBatchedPublishingSubjects(
    componentApi.fieldName$,
    componentApi.selectedOptions$,
    componentApi.searchString$
  );

  const renderOption = useCallback((option: EuiSelectableOption, searchStringValue: string) => {
    return (
      <EuiHighlight search={option.key === 'exists-option' ? '' : searchStringValue}>
        {option.label}
      </EuiHighlight>
    );
  }, []);

  /**
   * Fetch a few users on mount to show some options.
   * Current user should always be included
   */
  useEffect(() => {
    const abortController = new AbortController();

    suggestUserProfilesWithAvatar({
      name: searchString,
      signal: abortController.signal,
    }).then((users) => {
      setSuggestedUserIds(users.map((user) => user.uid));
    });

    return () => {
      abortController.abort();
    };
  }, [searchString]);

  /**
   * Map uids into user-avatars to be consumed by EuiSelectable
   */
  const selectableOptions = useMemo(() => {
    const selectedOptionsSet = new Set(selectedOptions);

    return suggestedUserIds.map((uid) => {
      const profile = getCachedUserProfileWithAvatar(uid);

      return {
        key: uid,
        label: profile?.user ? getUserDisplayName(profile.user) : undefined,
        checked: selectedOptionsSet.has(uid) ? 'on' : undefined, // TODO: change to "on" when selected
        prepend: profile?.user ? (
          <UserAvatar user={profile.user} avatar={profile.data.avatar} size="s" />
        ) : undefined,
      } as EuiSelectableOption;
    });
  }, [suggestedUserIds, selectedOptions]);

  return (
    <>
      <EuiFieldSearch
        compressed
        fullWidth
        value={searchString}
        onChange={(event) => componentApi.setSearchString(event.target.value)}
        data-test-subj="optionsList-assignee-search-input"
        placeholder={OptionsListStrings.popover.getSearchPlaceholder('exact')}
        aria-label={OptionsListStrings.popover.getSearchAriaLabel(fieldName)}
      />
      <EuiSpacer size="s" />
      <div data-test-subj="optionsList--scrollListener">
        <EuiSelectable
          options={selectableOptions}
          renderOption={(option) => renderOption(option, searchString)}
          listProps={{ onFocusBadge: false }}
          aria-label={OptionsListStrings.popover.getSuggestionsAriaLabel(
            fieldName,
            selectableOptions.length
          )}
          emptyMessage={<OptionsListPopoverEmptyMessage showOnlySelected={false} />}
          onChange={(newSuggestions, event, changedOption) => {
            componentApi.makeSelection(changedOption.key, false);
          }}
        >
          {(list) => list}
        </EuiSelectable>
      </div>
    </>
  );
});

UsersSuggestions.displayName = 'UsersSuggestions';
