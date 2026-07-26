/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo } from 'react';

import { UserActionTitleLink, type UserActionTitleLinkProps } from '../user_action_title_link';

export interface UserActionTitleProps {
  label: string;
  link?: UserActionTitleLinkProps;
  dataTestSubj?: string;
}

const UserActionTitleComponent: React.FC<UserActionTitleProps> = ({
  label,
  link,
  dataTestSubj = 'user-action-title',
}) => {
  return (
    <span data-test-subj={dataTestSubj}>
      {link ? `${label} ` : label}
      {link && <UserActionTitleLink {...link} />}
    </span>
  );
};

UserActionTitleComponent.displayName = 'UserActionTitle';

export const UserActionTitle = memo(UserActionTitleComponent);
