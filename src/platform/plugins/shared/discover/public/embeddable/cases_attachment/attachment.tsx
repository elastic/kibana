/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SAVED_SEARCH_ATTACHMENT_TYPE } from '@kbn/discover-utils';
import type {
  PersistableStateAttachmentType,
  PersistableStateAttachmentViewProps,
} from '@kbn/cases-plugin/public/client/attachment_framework/types';
import React from 'react';
import { EuiAvatar, EuiButtonIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

const AttachmentChildrenLazy = React.lazy(() => import('./attachment_children'));

export const generateAttachmentType = (): PersistableStateAttachmentType => ({
  id: SAVED_SEARCH_ATTACHMENT_TYPE,
  displayName: 'savedSearch',
  getAttachmentViewObject: () => ({
    event: (
      <FormattedMessage
        id="xpack.discover.cases.eventDescription"
        defaultMessage="added a Discover Session"
      />
    ),
    timelineAvatar: <EuiAvatar name="indicator" color="subdued" iconType="crosshairs" />,
    children: AttachmentChildrenLazy as unknown as React.LazyExoticComponent<
      React.FC<PersistableStateAttachmentViewProps>
    >,
    actions: AttachmentActions,
  }),
  icon: 'crosshairs',
});

const AttachmentActions: React.FC = () => {
  return (
    <EuiButtonIcon
      data-test-subj="attachment-action"
      onClick={() => {}}
      iconType="arrowRight"
      aria-label="View details"
    />
  );
};
