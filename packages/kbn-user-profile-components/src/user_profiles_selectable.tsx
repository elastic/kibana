/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiSelectableOption, EuiSelectableProps } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSelectable,
  EuiSpacer,
  EuiText,
  EuiHighlight,
  EuiTextColor,
} from '@elastic/eui';
import type { ReactNode } from 'react';
import React, { useEffect, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { getUserDisplayName } from './user_profile';
import type { UserProfileWithAvatar } from './user_avatar';
import { UserAvatar } from './user_avatar';

const NULL_OPTION_KEY = 'null';

/**
 * Props of {@link UserProfilesSelectable} component
 */
export interface UserProfilesSelectableProps<Option extends UserProfileWithAvatar | null>
  extends Pick<
    EuiSelectableProps,
    | 'height'
    | 'singleSelection'
    | 'loadingMessage'
    | 'noMatchesMessage'
    | 'emptyMessage'
    | 'errorMessage'
  > {
  /**
   * List of users to be rendered as suggestions.
   */
  defaultOptions?: Option[];

  /**
   * List of selected users or `null` (no users).
   */
  selectedOptions?: Option[];

  /**
   * List of users from search results. Should be updated based on the search term provided by `onSearchChange` callback.
   */
  options?: Option[];

  /**
   * Passes back the current selection.
   * @param options Either the list of selected users or `null` (no users).
   */
  onChange?(options: Option[]): void;

  /**
   * Passes back the search term.
   * @param searchTerm Search term
   */
  onSearchChange?(searchTerm: string): void;

  /**
   * Loading indicator for asynchronous search operations.
   */
  isLoading?: boolean;

  /**
   * Placeholder text of search field.
   */
  searchPlaceholder?: string;

  /**
   * Identifier of search field.
   */
  searchInputId?: string;

  /**
   * Returns text for selected status.
   * @param selectedCount Number of selected users
   */
  selectedStatusMessage?(selectedCount: number): ReactNode;

  /**
   * Label for clear button.
   */
  clearButtonLabel?: ReactNode;

  /**
   * Label of "no users" option.
   */
  nullOptionLabel?: string;

  /**
   * Label for default options group separator.
   */
  defaultOptionsLabel?: string;
}

/**
 * Renders a selectable component given a list of user profiles
 */
export const UserProfilesSelectable = <Option extends UserProfileWithAvatar | null>({
  selectedOptions,
  defaultOptions,
  options,
  onChange,
  onSearchChange,
  isLoading = false,
  singleSelection = false,
  height,
  loadingMessage,
  noMatchesMessage,
  emptyMessage,
  errorMessage,
  searchPlaceholder,
  searchInputId,
  selectedStatusMessage,
  nullOptionLabel,
  defaultOptionsLabel,
  clearButtonLabel,
}: UserProfilesSelectableProps<Option>) => {
  const [displayedOptions, setDisplayedOptions] = useState<SelectableOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Resets all displayed options
  const resetDisplayedOptions = () => {
    if (options) {
      setDisplayedOptions(options.map((option) => toSelectableOption(option, nullOptionLabel)));
      return;
    }

    setDisplayedOptions([]);
    updateDisplayedOptions();
  };

  const ensureSeparator = (values: SelectableOption[]) => {
    let index = values.findIndex((option) => option.isGroupLabel);
    if (index === -1) {
      const length = values.push({
        label:
          defaultOptionsLabel ??
          i18n.translate('userProfileComponents.userProfilesSelectable.defaultOptionsLabel', {
            defaultMessage: 'Suggested',
          }),
        isGroupLabel: true,
      });
      index = length - 1;
    }
    return index;
  };

  // Updates displayed options without removing or resorting exiting options
  const updateDisplayedOptions = () => {
    if (options) {
      return;
    }

    setDisplayedOptions((values) => {
      // Copy all displayed options
      const nextOptions: SelectableOption[] = [...values];

      // Get any newly added selected options
      const selectedOptionsToAdd: SelectableOption[] = selectedOptions
        ? selectedOptions
            .filter((profile) => !nextOptions.find((option) => isMatchingOption(option, profile)))
            .map((option) => toSelectableOption(option, nullOptionLabel))
        : [];

      // Get any newly added default options
      const defaultOptionsToAdd: SelectableOption[] = defaultOptions
        ? defaultOptions
            .filter(
              (profile) =>
                !nextOptions.find((option) => isMatchingOption(option, profile)) &&
                !selectedOptionsToAdd.find((option) => isMatchingOption(option, profile))
            )
            .map((option) => toSelectableOption(option, nullOptionLabel))
        : [];

      // Merge in any new options and add group separator if necessary
      if (defaultOptionsToAdd.length) {
        const separatorIndex = ensureSeparator(nextOptions);
        nextOptions.splice(separatorIndex, 0, ...selectedOptionsToAdd);
        nextOptions.push(...defaultOptionsToAdd);
      } else {
        nextOptions.push(...selectedOptionsToAdd);
      }

      return nextOptions;
    });
  };

  // Marks displayed options as checked or unchecked depending on `props.selectedOptions`
  const updateCheckedStatus = () => {
    setDisplayedOptions((values) =>
      values.map((option) => {
        if (selectedOptions) {
          const match = selectedOptions.find((profile) => isMatchingOption(option, profile));
          return { ...option, checked: match === undefined ? undefined : 'on' };
        }
        return { ...option, checked: undefined };
      })
    );
  };

  useEffect(resetDisplayedOptions, [options]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(updateDisplayedOptions, [defaultOptions, selectedOptions]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(updateCheckedStatus, [options, defaultOptions, selectedOptions]);

  const selectedCount = selectedOptions ? selectedOptions.length : 0;

  return (
    <EuiSelectable
      options={displayedOptions}
      // @ts-expect-error: Type of `nextOptions` in EuiSelectable does not match what's actually being passed back so need to manually override it
      onChange={(
        nextOptions: Array<EuiSelectableOption<{ data: Partial<UserProfileWithAvatar> }>>
      ) => {
        if (!onChange) {
          return;
        }

        // Take all selected options from `nextOptions` unless already in `props.selectedOptions`
        // @ts-expect-error
        const values: Option[] = nextOptions
          .filter((option) => {
            if (option.isGroupLabel || option.checked !== 'on') {
              return false;
            }
            if (
              selectedOptions &&
              selectedOptions.find((profile) => isMatchingOption(option, profile)) !== undefined
            ) {
              return false;
            }
            return true;
          })
          .map((option) => (option.key === NULL_OPTION_KEY ? null : option.data));

        // Add all options from `props.selectedOptions` unless they have been deselected in `nextOptions`
        if (selectedOptions && !singleSelection) {
          selectedOptions.forEach((profile) => {
            const match = nextOptions.find((option) => isMatchingOption(option, profile));
            if (match === undefined || match.checked === 'on') {
              if (match && match.key === NULL_OPTION_KEY) {
                values.unshift(profile);
              } else {
                values.push(profile);
              }
            }
          });
        }

        onChange(values);
      }}
      style={{ maxHeight: height }}
      singleSelection={singleSelection}
      searchable
      searchProps={{
        placeholder:
          searchPlaceholder ??
          i18n.translate('userProfileComponents.userProfilesSelectable.searchPlaceholder', {
            defaultMessage: 'Search',
          }),
        value: searchTerm,
        onChange: (value) => {
          setSearchTerm(value);
          onSearchChange?.(value);
        },
        isLoading,
        isClearable: !isLoading,
        id: searchInputId,
      }}
      isPreFiltered
      listProps={{ onFocusBadge: false }}
      loadingMessage={loadingMessage}
      noMatchesMessage={noMatchesMessage}
      emptyMessage={emptyMessage}
      errorMessage={errorMessage}
      renderOption={(option, searchValue) => {
        if (option.user) {
          return (
            <EuiFlexGroup
              alignItems="center"
              justifyContent="spaceBetween"
              gutterSize="s"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
              </EuiFlexItem>
              {option.user.email ? (
                <EuiFlexItem grow={false}>
                  <EuiTextColor color="subdued">
                    {searchValue ? (
                      <EuiHighlight search={searchValue}>{option.user.email}</EuiHighlight>
                    ) : (
                      option.user.email
                    )}
                  </EuiTextColor>
                </EuiFlexItem>
              ) : undefined}
            </EuiFlexGroup>
          );
        }
        return <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>;
      }}
    >
      {(list, search) => (
        <>
          <EuiPanel hasShadow={false} paddingSize="s">
            {search}
            {!singleSelection ? (
              <>
                <EuiSpacer size="s" />
                <EuiFlexGroup
                  alignItems="center"
                  justifyContent="spaceBetween"
                  gutterSize="s"
                  responsive={false}
                >
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {selectedStatusMessage ? (
                        selectedStatusMessage(selectedCount)
                      ) : (
                        <FormattedMessage
                          id="userProfileComponents.userProfilesSelectable.selectedStatusMessage"
                          defaultMessage="{count, plural, one {# user selected} other {# users selected}}"
                          values={{ count: selectedCount }}
                        />
                      )}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {selectedCount ? (
                      <EuiButtonEmpty
                        size="xs"
                        flush="right"
                        onClick={() => onChange?.([])}
                        style={{ height: '1rem' }}
                      >
                        {clearButtonLabel ?? (
                          <FormattedMessage
                            id="userProfileComponents.userProfilesSelectable.clearButtonLabel"
                            defaultMessage="Remove all users"
                          />
                        )}
                      </EuiButtonEmpty>
                    ) : undefined}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            ) : undefined}
          </EuiPanel>
          <EuiHorizontalRule margin="none" />
          {list}
        </>
      )}
    </EuiSelectable>
  );
};

type SelectableOption = EuiSelectableOption<Partial<UserProfileWithAvatar>>;

function toSelectableOption(
  userProfile: UserProfileWithAvatar | null,
  nullOptionLabel?: string
): SelectableOption {
  if (userProfile) {
    return {
      key: userProfile.uid,
      prepend: <UserAvatar user={userProfile.user} avatar={userProfile.data.avatar} size="s" />,
      label: getUserDisplayName(userProfile.user),
      data: userProfile,
    };
  }
  return {
    key: NULL_OPTION_KEY,
    label:
      nullOptionLabel ??
      i18n.translate('userProfileComponents.userProfilesSelectable.nullOptionLabel', {
        defaultMessage: 'No users',
      }),
  };
}

function isMatchingOption<Option extends UserProfileWithAvatar | null>(
  option: SelectableOption,
  profile: Option
) {
  return option.key === (profile ? profile.uid : NULL_OPTION_KEY);
}
