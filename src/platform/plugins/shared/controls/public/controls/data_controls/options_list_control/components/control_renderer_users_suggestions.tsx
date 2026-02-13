/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFieldSearch, EuiHighlight, EuiSelectable, EuiSpacer, EuiText } from '@elastic/eui';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { getUserDisplayName, UserAvatar } from '@kbn/user-profile-components';
import { NO_ASSIGNEES_OPTION_KEY } from '../constants';
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
    if (option.key === NO_ASSIGNEES_OPTION_KEY) {
      return <EuiHighlight search="">{option.label}</EuiHighlight>;
    }

    const profile = option.key ? getCachedUserProfileWithAvatar(String(option.key)) : undefined;
    const displayName = profile?.user ? getUserDisplayName(profile.user) : option.label ?? '';
    const email = profile?.user?.email;

    return (
      <>
        <div className="eui-textTruncate">
          <EuiHighlight search={searchStringValue}>{displayName}</EuiHighlight>
        </div>
        {email && email !== displayName ? (
          <EuiText size="xs" color="subdued" className="eui-textTruncate">
            {searchStringValue ? (
              <EuiHighlight search={searchStringValue}>{email}</EuiHighlight>
            ) : (
              email
            )}
          </EuiText>
        ) : undefined}
      </>
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

    const noAssigneesOption: EuiSelectableOption = {
      key: NO_ASSIGNEES_OPTION_KEY,
      label: OptionsListStrings.controlAndPopover.getNoAssignees(),
      checked: selectedOptionsSet.has(NO_ASSIGNEES_OPTION_KEY) ? 'on' : undefined,
      'data-test-subj': 'optionsList-control-selection-no-assignees',
    };

    const userSuggestions = suggestedUserIds.map((uid) => {
      const profile = getCachedUserProfileWithAvatar(uid);

      const displayName = profile?.user ? getUserDisplayName(profile.user) : undefined;

      return {
        key: uid,
        label: displayName,
        checked: selectedOptionsSet.has(uid) ? 'on' : undefined,
        prepend: profile?.user ? (
          <UserAvatar user={profile.user} avatar={profile.data.avatar} size="s" />
        ) : undefined,
      } as EuiSelectableOption;
    });

    return [noAssigneesOption, ...userSuggestions];
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
          listProps={{ onFocusBadge: false, rowHeight: 48 }}
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
