/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  EuiCallOut,
  EuiHighlight,
} from '@elastic/eui';
import type { ReactNode } from 'react';
import React, { useEffect, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { getUserDisplayLabel, getUserDisplayName } from './user_profile';
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
    | 'data-test-subj'
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
   * Maximum number of users allowed to be selected.
   *
   * This limit is not enforced and only used to show a warning message.
   */
  limit?: number;

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
   * Returns message for number of selected users.
   * @param selectedCount Number of selected users
   */
  selectedStatusMessage?(selectedCount: number): ReactNode;

  /**
   * Returns message when maximum number of selected users are reached.
   * @param limit Maximum number of users allowed to be selected
   */
  limitReachedMessage?(limit: number): ReactNode;

  /**
   * Label for clear button.
   */
  clearButtonLabel?: ReactNode;

  /**
   * Label of "no users" option.
   */
  nullOptionLabel?: string;

  /**
   * Additional props for "no users" option.
   */
  nullOptionProps?: NullOptionProps;

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
  limit,
  height,
  loadingMessage,
  noMatchesMessage,
  emptyMessage,
  errorMessage,
  searchPlaceholder,
  searchInputId,
  selectedStatusMessage,
  limitReachedMessage,
  nullOptionLabel,
  nullOptionProps,
  defaultOptionsLabel,
  clearButtonLabel,
  ...props
}: UserProfilesSelectableProps<Option>) => {
  const [displayedOptions, setDisplayedOptions] = useState<SelectableOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedCount = selectedOptions ? selectedOptions.length : 0;
  const limitReached = limit ? selectedCount >= limit : false;

  // Resets all displayed options
  const resetDisplayedOptions = () => {
    if (options) {
      setDisplayedOptions(
        options.map((option) => toSelectableOption(option, nullOptionLabel, nullOptionProps))
      );
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
            .map((option) => toSelectableOption(option, nullOptionLabel, nullOptionProps))
        : [];

      // Get any newly added default options
      const defaultOptionsToAdd: SelectableOption[] = defaultOptions
        ? defaultOptions
            .filter(
              (profile) =>
                !nextOptions.find((option) => isMatchingOption(option, profile)) &&
                !selectedOptionsToAdd.find((option) => isMatchingOption(option, profile))
            )
            .map((option) => toSelectableOption(option, nullOptionLabel, nullOptionProps))
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
          const checked = match === undefined ? undefined : 'on';
          const disabled = checked ? false : limitReached;
          return {
            ...option,
            checked,
            disabled,
            prepend: option.data ? (
              <UserAvatar
                user={option.data.user}
                avatar={option.data.data?.avatar}
                size="s"
                isDisabled={disabled}
              />
            ) : undefined,
          };
        }
        return { ...option, checked: undefined, disabled: undefined };
      })
    );
  };

  useEffect(resetDisplayedOptions, [options]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(updateDisplayedOptions, [defaultOptions, selectedOptions]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(updateCheckedStatus, [options, defaultOptions, selectedOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <EuiSelectable
      data-test-subj={props['data-test-subj']}
      options={displayedOptions}
      onChange={(nextOptions: SelectableOption[]) => {
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
      listProps={{ onFocusBadge: false, rowHeight: 48 }}
      loadingMessage={loadingMessage}
      noMatchesMessage={noMatchesMessage}
      emptyMessage={emptyMessage}
      errorMessage={errorMessage}
      renderOption={(option: SelectableOption, searchValue) => {
        if (option.user) {
          const displayName = getUserDisplayName(option.user);
          return (
            <>
              <div className="eui-textTruncate">
                <EuiHighlight search={searchValue}>{displayName}</EuiHighlight>
              </div>
              {option.user.email && option.user.email !== displayName ? (
                <EuiText
                  size={'xs'}
                  color={option.disabled ? 'disabled' : 'subdued'}
                  className="eui-textTruncate"
                >
                  {searchValue ? (
                    <EuiHighlight search={searchValue}>{option.user.email}</EuiHighlight>
                  ) : (
                    option.user.email
                  )}
                </EuiText>
              ) : undefined}
            </>
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
          {limit && selectedCount >= limit ? (
            <>
              <EuiHorizontalRule margin="none" />
              <EuiCallOut
                title={
                  limitReachedMessage ? (
                    limitReachedMessage(limit)
                  ) : (
                    <FormattedMessage
                      id="userProfileComponents.userProfilesSelectable.limitReachedMessage"
                      defaultMessage="You've selected the maximum of {count, plural, one {# user} other {# users}}"
                      values={{ count: limit }}
                    />
                  )
                }
                color="warning"
                size="s"
              />
            </>
          ) : undefined}
          <EuiHorizontalRule margin="none" />
          {list}
        </>
      )}
    </EuiSelectable>
  );
};

type SelectableOption = EuiSelectableOption<Partial<UserProfileWithAvatar>>;
export type NullOptionProps = Partial<Pick<EuiSelectableOption, 'append'>>;

function toSelectableOption(
  userProfile: UserProfileWithAvatar | null,
  nullOptionLabel?: string,
  nullOptionProps?: NullOptionProps
): SelectableOption {
  if (userProfile) {
    return {
      key: userProfile.uid,
      label: getUserDisplayLabel(userProfile.user),
      data: userProfile,
      'data-test-subj': `userProfileSelectableOption-${userProfile.user.username}`,
    };
  }
  return {
    key: NULL_OPTION_KEY,
    label:
      nullOptionLabel ??
      i18n.translate('userProfileComponents.userProfilesSelectable.nullOptionLabel', {
        defaultMessage: 'No users',
      }),
    'data-test-subj': 'userProfileSelectableOption-null',
    ...nullOptionProps,
  };
}

function isMatchingOption<Option extends UserProfileWithAvatar | null>(
  option: SelectableOption,
  profile: Option
) {
  return option.key === (profile ? profile.uid : NULL_OPTION_KEY);
}
