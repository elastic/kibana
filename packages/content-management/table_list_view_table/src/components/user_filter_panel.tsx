/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import type { FC } from 'react';
import {
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiFilterButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButtonEmpty,
  EuiTextColor,
  EuiSpacer,
  EuiLink,
  useEuiTheme,
  EuiPopoverFooter,
  EuiButton,
} from '@elastic/eui';
import type { EuiSelectableProps, ExclusiveUnion } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { UserProfile, UserProfilesPopover } from '@kbn/user-profile-components';

import { useServices } from '../services';

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;
const modifierKeyPrefix = isMac ? '⌘' : '^';

const clearSelectionBtnCSS = css`
  height: auto;
`;

const saveBtnWrapperCSS = css`
  width: 100%;
`;

interface Context {
  clearUserSelection: () => void;
  closePopover: () => void;
  isPopoverOpen: boolean;
  isInUse: boolean;
  options: UserProfile[];
  totalActiveFilters: number;
  onFilterButtonClick: () => void;
  onSelectChange: (updatedOptions: UserProfile[]) => void;
  onSearchChange: (searchValue: string) => void;
}

export const UserFilterContext = React.createContext<Context | null>(null);

export const UserFilterPanel: FC<{}> = () => {
  const { euiTheme } = useEuiTheme();
  const componentContext = React.useContext(UserFilterContext);
  if (!componentContext)
    throw new Error('UserFilterPanel must be used within a UserFilterContextProvider');
  const {
    isPopoverOpen,
    isInUse,
    options,
    totalActiveFilters,
    onFilterButtonClick,
    onSelectChange,
    closePopover,
    clearUserSelection,
    onSearchChange,
  } = componentContext;

  const { navigateToUrl, currentAppId$, getTagManagementUrl } = useServices();
  const isSearchVisible = options.length > 10;

  const searchBoxCSS = css`
    padding: ${euiTheme.size.s};
    border-bottom: ${euiTheme.border.thin};
  `;

  const popoverTitleCSS = css`
    height: ${euiTheme.size.xxxl};
  `;

  let searchProps: ExclusiveUnion<
    { searchable: false },
    {
      searchable: true;
      searchProps: EuiSelectableProps['searchProps'];
    }
  > = {
    searchable: false,
  };

  if (isSearchVisible) {
    searchProps = {
      searchable: true,
      searchProps: {
        compressed: true,
      },
    };
  }

  return (
    <>
      <UserProfilesPopover
        button={
          <EuiFilterButton
            iconType="arrowDown"
            iconSide="right"
            data-test-subj="userFilterPopoverButton"
            onClick={onFilterButtonClick}
            hasActiveFilters={totalActiveFilters > 0}
            numActiveFilters={totalActiveFilters}
            grow
          >
            Created by
          </EuiFilterButton>
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        selectableProps={{
          options,
          onChange: onSelectChange,
          onSearchChange,
          singleSelection: true,
          ...searchProps,
        }}
        panelProps={{ css: { width: euiTheme.base * 18 } }}
        panelStyle={isInUse ? { transition: 'none' } : undefined}
      />
    </>
  );
};
