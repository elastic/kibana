/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiSelectableOption, EuiSelectableProps, ExclusiveUnion } from '@elastic/eui';
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
import type { FunctionComponent, ReactNode } from 'react';
import React, { useEffect, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { getUserDisplayName } from './user_profile';
import type { UserProfileWithAvatar } from './user_avatar';
import { UserAvatar } from './user_avatar';

/**
 * Props of {@link UserProfilesSelectable} component without ability to explicitly select "no user".
 */
interface PropsWithoutNull {
  /**
   * Allow explicitly selecting "no user".
   */
  allowNull?: false;

  /**
   * List of selected users.
   */
  selectedOptions?: UserProfileWithAvatar[];

  /**
   * Passes back the current selection.
   * @param options List of selected users.
   */
  onChange?(options: UserProfileWithAvatar[]): void;
}

/**
 * Props of {@link UserProfilesSelectable} component with ability to explicitly select "no user".
 */
interface PropsWithNull {
  /**
   * Allow explicitly selecting "no user".
   */
  allowNull: true;

  /**
   * List of selected users or `null` (no user).
   */
  selectedOptions?: UserProfileWithAvatar[] | null;

  /**
   * Passes back the current selection.
   * @param options Either the list of selected users or `null` (no user).
   */
  onChange?(options: UserProfileWithAvatar[] | null): void;

  /**
   * Label of "no user" option.
   */
  nullOptionLabel?: string;
}

/**
 * Common props of {@link UserProfilesSelectable} component
 */
interface CommonProps
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
  defaultOptions?: UserProfileWithAvatar[];

  /**
   * List of users from search results. Should be updated based on the search term provided by `onSearchChange` callback.
   */
  options?: UserProfileWithAvatar[];

  /**
   * Show group separator between selected and default options.
   */
  showSeparator?: boolean;

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
   * Label for default options separator.
   */
  separatorLabel?: string;
}

/**
 * Props of {@link UserProfilesSelectable} component
 */
export type UserProfilesSelectableProps = CommonProps &
  ExclusiveUnion<PropsWithoutNull, PropsWithNull>;

/**
 * Renders a selectable component given a list of user profiles
 */
export const UserProfilesSelectable: FunctionComponent<UserProfilesSelectableProps> = ({
  selectedOptions,
  defaultOptions,
  options,
  allowNull = false,
  showSeparator = !allowNull,
  onChange,
  onSearchChange,
  isLoading = false,
  singleSelection = allowNull,
  height,
  loadingMessage,
  noMatchesMessage,
  emptyMessage,
  errorMessage,
  searchPlaceholder,
  searchInputId,
  selectedStatusMessage,
  nullOptionLabel,
  separatorLabel,
  clearButtonLabel,
}) => {
  const [displayedOptions, setDisplayedOptions] = useState<SelectableOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Resets all displayed options
  const resetDisplayedOptions = () => {
    if (options) {
      setDisplayedOptions(options.map((option) => toSelectableOption(option, searchTerm)));
      return;
    }

    setDisplayedOptions(
      allowNull
        ? [
            {
              key: 'null',
              label:
                nullOptionLabel ??
                i18n.translate('userProfileComponents.userProfilesSelectable.nullLabel', {
                  defaultMessage: 'No user',
                }),
            },
          ]
        : []
    );
    updateDisplayedOptions();
  };

  const ensureSeparator = (values: SelectableOption[]) => {
    let index = values.findIndex((option) => option.isGroupLabel);
    if (index === -1) {
      const length = values.push({
        label:
          separatorLabel ??
          i18n.translate('userProfileComponents.userProfilesSelectable.separatorLabel', {
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
            .filter((profile) => !nextOptions.find((option) => option.key === profile.uid))
            .map((option) => toSelectableOption(option, searchTerm))
        : [];

      // Get any newly added default options
      const defaultOptionsToAdd: SelectableOption[] = defaultOptions
        ? defaultOptions
            .filter(
              (profile) =>
                !nextOptions.find((option) => option.key === profile.uid) &&
                !selectedOptionsToAdd.find((option) => option.key === profile.uid)
            )
            .map((option) => toSelectableOption(option, searchTerm))
        : [];

      // Merge in any new options and add group separator if necessary
      if (defaultOptionsToAdd.length) {
        const separatorIndex = showSeparator ? ensureSeparator(nextOptions) : nextOptions.length;
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
        if (option.key === 'null') {
          return { ...option, checked: selectedOptions === null ? 'on' : undefined };
        }
        if (selectedOptions) {
          const match = selectedOptions.find((p) => p.uid === option.key);
          return { ...option, checked: match ? 'on' : undefined };
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
      onChange={(nextOptions: Array<EuiSelectableOption<{ data: UserProfileWithAvatar }>>) => {
        if (!onChange) {
          return;
        }

        // Return `null` if selected
        const [firstOption] = nextOptions;
        if (firstOption && firstOption.key === 'null' && firstOption.checked === 'on') {
          // @ts-expect-error: Typescript doesn't correctly infer that change handler must accept `null` when `allowNull` is enabled
          onChange(null);
          return;
        }

        // Take all selected options from `nextOptions` unless already in `props.selectedOptions`
        const values: UserProfileWithAvatar[] = nextOptions
          .filter((option) => {
            if (option.isGroupLabel || option.checked !== 'on') {
              return false;
            }
            if (selectedOptions && selectedOptions.find((p) => p.uid === option.key)) {
              return false;
            }
            return true;
          })
          .map((option) => option.data);

        // Add all options from `props.selectedOptions` unless they have been deselected in `nextOptions`
        if (selectedOptions && !singleSelection) {
          selectedOptions.forEach((profile) => {
            const match = nextOptions.find((o) => o.key === profile.uid);
            if (!match || match.checked === 'on') {
              values.push(profile);
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

function toSelectableOption(userProfile: UserProfileWithAvatar, search: string): SelectableOption {
  return {
    key: userProfile.uid,
    prepend: <UserAvatar user={userProfile.user} avatar={userProfile.data.avatar} size="s" />,
    label: getUserDisplayName(userProfile.user),
    data: userProfile,
  };
}
