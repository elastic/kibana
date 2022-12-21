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
 * Props of {@link UserProfilesSelectable} component
 */
export interface UserProfilesSelectableProps
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
   * List of selected users.
   */
  selectedOptions?: UserProfileWithAvatar[];

  /**
   * List of users from search results. Should be updated based on the search term provided by `onSearchChange` callback.
   */
  options?: UserProfileWithAvatar[];

  /**
   * Passes back the list of selected users.
   * @param options List of selected users
   */
  onChange?(options: UserProfileWithAvatar[]): void;

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
   * Placeholder text for search box.
   */
  searchPlaceholder?: string;

  /**
   * Returns text for selected status.
   * @param selectedCount Number of selected users
   */
  selectedStatusMessage?(selectedCount: number): ReactNode;

  /**
   * Text for label of clear button.
   */
  clearButtonLabel?: ReactNode;
}

/**
 * Renders a selectable component given a list of user profiles
 */
export const UserProfilesSelectable: FunctionComponent<UserProfilesSelectableProps> = ({
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
  selectedStatusMessage,
  clearButtonLabel,
}) => {
  const [displayedOptions, setDisplayedOptions] = useState<SelectableOption[]>([]);

  // Resets all displayed options
  const resetDisplayedOptions = () => {
    if (options) {
      setDisplayedOptions(options.map(toSelectableOption));
      return;
    }

    setDisplayedOptions([]);
    updateDisplayedOptions();
  };

  const ensureSeparator = (values: SelectableOption[]) => {
    let index = values.findIndex((option) => option.isGroupLabel);
    if (index === -1) {
      const length = values.push({
        label: i18n.translate(
          'sharedUXPackages.userProfileComponents.userProfilesSelectable.suggestedLabel',
          {
            defaultMessage: 'Suggested',
          }
        ),
        isGroupLabel: true,
      } as SelectableOption);
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
            .map(toSelectableOption)
        : [];

      // Get any newly added default options
      const defaultOptionsToAdd: SelectableOption[] = defaultOptions
        ? defaultOptions
            .filter(
              (profile) =>
                !nextOptions.find((option) => option.key === profile.uid) &&
                !selectedOptionsToAdd.find((option) => option.key === profile.uid)
            )
            .map(toSelectableOption)
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

  const placeholder =
    searchPlaceholder ??
    i18n.translate(
      'sharedUXPackages.userProfileComponents.userProfilesSelectable.searchPlaceholder',
      {
        defaultMessage: 'Search',
      }
    );

  return (
    <EuiSelectable
      options={displayedOptions}
      // @ts-expect-error: Type of `nextOptions` in EuiSelectable does not match what's actually being passed back so need to manually override it
      onChange={(nextOptions: Array<EuiSelectableOption<{ data: UserProfileWithAvatar }>>) => {
        if (!onChange) {
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
        placeholder,
        onChange: onSearchChange,
        isLoading,
        isClearable: !isLoading,
      }}
      isPreFiltered
      listProps={{ onFocusBadge: false }}
      loadingMessage={loadingMessage}
      noMatchesMessage={noMatchesMessage}
      emptyMessage={emptyMessage}
      errorMessage={errorMessage}
    >
      {(list, search) => (
        <>
          <EuiPanel hasShadow={false} paddingSize="s">
            {search}
            <EuiSpacer size="s" />
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {selectedStatusMessage ? (
                    selectedStatusMessage(selectedCount)
                  ) : (
                    <FormattedMessage
                      id="sharedUXPackages.userProfileComponents.userProfilesSelectable.selectedStatusMessage"
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
                        id="sharedUXPackages.userProfileComponents.userProfilesSelectable.clearButtonLabel"
                        defaultMessage="Remove all users"
                      />
                    )}
                  </EuiButtonEmpty>
                ) : null}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
          <EuiHorizontalRule margin="none" />
          {list}
        </>
      )}
    </EuiSelectable>
  );
};

type SelectableOption = EuiSelectableOption<UserProfileWithAvatar>;

function toSelectableOption(userProfile: UserProfileWithAvatar): SelectableOption {
  // @ts-ignore: `isGroupLabel` is not required here but TS complains
  return {
    key: userProfile.uid,
    prepend: <UserAvatar user={userProfile.user} avatar={userProfile.data.avatar} size="s" />,
    label: getUserDisplayName(userProfile.user),
    append: <EuiTextColor color="subdued">{userProfile.user.email}</EuiTextColor>,
    data: userProfile,
  };
}
