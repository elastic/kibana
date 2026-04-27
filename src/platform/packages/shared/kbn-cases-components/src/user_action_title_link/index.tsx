/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, useCallback, useMemo } from 'react';
import { isEmpty } from 'lodash';
import { EuiLink, EuiLoadingSpinner } from '@elastic/eui';
import { LINK_LOADING_ARIA_LABEL, UNKNOWN_LINK_LABEL } from './translations';

export interface UserActionTitleLinkProps {
  targetId?: string | null;
  label?: string | null;
  fallbackLabel?: string;
  getHref?: (targetId: string | null | undefined) => string | undefined;
  onClick?: (targetId: string | null | undefined, ev: React.MouseEvent | MouseEvent) => void;
  dataTestSubj?: string;
  isLoading?: boolean;
}

const UserActionTitleLinkComponent: React.FC<UserActionTitleLinkProps> = ({
  targetId,
  label,
  fallbackLabel,
  getHref,
  onClick,
  dataTestSubj = 'user-action-link',
  isLoading = false,
}) => {
  const onLinkClick = useCallback(
    (ev: React.MouseEvent) => {
      if (onClick) {
        ev.preventDefault();
        onClick(targetId, ev);
      }
    },
    [targetId, onClick]
  );

  const href = getHref?.(targetId);
  const displayLabel = label ?? fallbackLabel ?? UNKNOWN_LINK_LABEL;

  const isValidLink = useMemo(() => {
    if (!onClick && !href) {
      return false;
    }
    return !isEmpty(targetId);
  }, [onClick, href, targetId]);

  if (isLoading) {
    return (
      <EuiLoadingSpinner
        size="m"
        data-test-subj="user-action-link-loading"
        aria-label={LINK_LOADING_ARIA_LABEL}
      />
    );
  }

  if (isValidLink) {
    return (
      <EuiLink onClick={onLinkClick} href={href} data-test-subj={dataTestSubj}>
        {displayLabel}
      </EuiLink>
    );
  }

  return <>{displayLabel}</>;
};

UserActionTitleLinkComponent.displayName = 'UserActionTitleLink';

export const UserActionTitleLink = memo(UserActionTitleLinkComponent);
