/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, lazy } from 'react';
import {
  SAVED_SEARCH_ATTACHMENT_TYPE,
  type SavedSearchCasesAttachmentPersistedState,
} from '@kbn/discover-utils';
import {
  type PersistableStateAttachmentType,
  type AttachmentAction,
  type PersistableStateAttachmentViewProps,
} from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { EuiAvatar, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

const AttachmentChildrenLazy = React.lazy(() => import('./attachment_children'));

const GoToDiscoverButton = lazy(() =>
  import('./attachment_children/actions/go_to_discover_action').then((module) => ({
    default: module.GoToDiscoverButton,
  }))
);

function getGoToDiscoverButton({
  state,
  isIcon = false,
}: {
  state: SavedSearchCasesAttachmentPersistedState;
  isIcon?: boolean;
}) {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <GoToDiscoverButton isIcon={isIcon} state={state} />
    </Suspense>
  );
}

const getSavedSearchAttachmentActions = (
  state: SavedSearchCasesAttachmentPersistedState
): AttachmentAction[] => [
  {
    type: 'custom' as const,
    render: () => getGoToDiscoverButton({ state, isIcon: true }),
    isPrimary: true,
  },
  {
    type: 'custom' as const,
    render: () => getGoToDiscoverButton({ state, isIcon: false }),
    isPrimary: false,
  },
];

export const generateAttachmentType = (): PersistableStateAttachmentType => ({
  id: SAVED_SEARCH_ATTACHMENT_TYPE,
  displayName: 'savedSearch',
  getAttachmentViewObject: (props: PersistableStateAttachmentViewProps<unknown>) => {
    const { persistableStateAttachmentState } =
      props as PersistableStateAttachmentViewProps<SavedSearchCasesAttachmentPersistedState>;
    return {
      event: (
        <FormattedMessage
          id="discover.cases.eventDescription"
          defaultMessage="added a Discover Session"
        />
      ),
      getActions: () => getSavedSearchAttachmentActions(persistableStateAttachmentState),
      timelineAvatar: <EuiAvatar name="indicator" color="subdued" iconType="discoverApp" />,
      children: AttachmentChildrenLazy as unknown as React.LazyExoticComponent<
        React.FC<PersistableStateAttachmentViewProps>
      >,
    };
  },
  icon: 'discoverApp',
});
