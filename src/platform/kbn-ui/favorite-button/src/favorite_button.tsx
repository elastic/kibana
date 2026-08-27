/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import classNames from 'classnames';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import type { FavoriteButtonStatus } from './favorite_status';
import { StardustWrapper } from './stardust_wrapper';

export interface FavoriteButtonProps {
  status: FavoriteButtonStatus;
  onClick: () => void;
  addLabel: string;
  removeLabel: string;
  isDisabled?: boolean;
  className?: string;
  'data-test-subj'?: string;
}

export const FavoriteButton = ({
  status,
  onClick,
  addLabel,
  removeLabel,
  isDisabled,
  className,
  'data-test-subj': dataTestSubj,
}: FavoriteButtonProps) => {
  const isFavorite = status !== 'unfavorited';
  const isAdding = status === 'adding';
  const isRemoving = status === 'removing';
  const isPersistedFavorite = status === 'favorited' || status === 'removing';
  const label = isFavorite ? removeLabel : addLabel;

  return (
    <StardustWrapper className={className} active={isAdding}>
      <EuiToolTip content={label} disableScreenReaderOutput>
        <EuiButtonIcon
          isLoading={isRemoving}
          isDisabled={isDisabled}
          aria-label={label}
          iconType={isFavorite ? 'starFill' : 'star'}
          onClick={onClick}
          className={classNames('cm-favorite-button', {
            'cm-favorite-button--active': isPersistedFavorite && !isRemoving,
            'cm-favorite-button--empty': !isPersistedFavorite && !isAdding,
          })}
          data-test-subj={dataTestSubj}
        />
      </EuiToolTip>
    </StardustWrapper>
  );
};
