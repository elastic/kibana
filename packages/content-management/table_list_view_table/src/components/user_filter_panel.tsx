/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiFilterButton, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { UserProfile, UserProfilesPopover } from '@kbn/user-profile-components';
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { useServices } from '../services';
import { NoUsersTip } from './user_missing_tip';

interface Context {
  enabled: boolean;
  onSelectedUsersChange: (users: string[]) => void;
  selectedUsers: string[];
  allUsers: string[];
  showNoUserOption: boolean;
}

const UserFilterContext = React.createContext<Context | null>(null);
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 30 * 60 * 1000 } },
});

export const UserFilterContextProvider: FC<Context> = ({ children, ...props }) => {
  if (!props.enabled) {
    return <>{children}</>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <UserFilterContext.Provider value={props}>{children}</UserFilterContext.Provider>
    </QueryClientProvider>
  );
};

export const NULL_USER = 'no-user';

export const UserFilterPanel: FC<{}> = () => {
  const { bulkGetUserProfiles } = useServices();
  const { euiTheme } = useEuiTheme();
  const componentContext = React.useContext(UserFilterContext);
  if (!componentContext)
    throw new Error('UserFilterPanel must be used within a UserFilterContextProvider');
  if (!bulkGetUserProfiles)
    throw new Error('UserFilterPanel must be used with a bulkGetUserProfiles function');

  const { onSelectedUsersChange, selectedUsers, showNoUserOption } = componentContext;

  const [isPopoverOpen, setPopoverOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  const query = useQuery({
    queryKey: ['user-filter-suggestions', componentContext.allUsers],
    queryFn: () => bulkGetUserProfiles(componentContext.allUsers),
    enabled: isPopoverOpen,
  });

  const usersMap = React.useMemo(() => {
    if (!query.data) return {};
    return query.data.reduce((acc, user) => {
      acc[user.uid] = user;
      return acc;
    }, {} as Record<string, UserProfile>);
  }, [query.data]);

  const visibleOptions = React.useMemo(() => {
    if (!query.data || query.data.length === 0) return [];
    // attach null to the end of the list to represent the "no creator" option
    const users =
      showNoUserOption || selectedUsers.includes(NULL_USER) ? [...query.data, null] : query.data;

    if (!searchTerm) {
      return users;
    }

    return users.filter((user) => {
      // keep the "no creator" option if it's selected
      if (!user) {
        return selectedUsers.includes(NULL_USER);
      }

      // keep the user if it's selected
      if (selectedUsers.includes(user.uid)) return true;

      // filter only users that match the search term
      const searchString = (
        user.uid +
        user.user.username +
        (user.user.email ?? '') +
        (user.user.full_name ?? '')
      ).toLowerCase();
      return searchString.includes(searchTerm.toLowerCase());
    });
  }, [query.data, searchTerm, selectedUsers, showNoUserOption]);

  return (
    <>
      <UserProfilesPopover
        button={
          <EuiFilterButton
            iconType="arrowDown"
            iconSide="right"
            data-test-subj="userFilterPopoverButton"
            onClick={() => setPopoverOpen(!isPopoverOpen)}
            hasActiveFilters={selectedUsers.length > 0}
            numActiveFilters={selectedUsers.length}
            grow
          >
            <FormattedMessage
              id="contentManagement.tableList.listing.userFilter.filterLabel"
              defaultMessage="Created by"
            />
          </EuiFilterButton>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setPopoverOpen(false)}
        selectableProps={{
          'data-test-subj': 'userSelectableList',
          isLoading: query.isLoading,
          options: visibleOptions,
          errorMessage: query.error ? (
            <FormattedMessage
              id="contentManagement.tableList.listing.userFilter.errorMessage"
              defaultMessage="Failed to load users"
            />
          ) : undefined,
          emptyMessage: (
            <p data-test-subj="userFilterEmptyMessage">
              <FormattedMessage
                id="contentManagement.tableList.listing.userFilter.emptyMessage"
                defaultMessage="None of the dashboards have creators"
              />
              {<NoUsersTip />}
            </p>
          ),
          nullOptionLabel: i18n.translate(
            'contentManagement.tableList.listing.userFilter.noCreators',
            {
              defaultMessage: 'No creators',
            }
          ),
          nullOptionProps: {
            append: <NoUsersTip />,
          },
          clearButtonLabel: (
            <FormattedMessage
              id="contentManagement.tableList.listing.userFilter.clearFilterButtonLabel"
              defaultMessage="Clear filter"
            />
          ),
          selectedOptions: selectedUsers.map((uid) =>
            uid === NULL_USER ? null : usersMap[uid] ?? { uid, user: { username: uid } }
          ),
          onChange: (options) => {
            onSelectedUsersChange(options.map((option) => (option ? option.uid : NULL_USER)));
          },
          onSearchChange: setSearchTerm,
        }}
        panelProps={{ css: { minWidth: euiTheme.base * 22 } }}
      />
    </>
  );
};
