/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiBadge, useInnerText, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import classNames from 'classnames';
import React, { FC } from 'react';
import type { SavedQuery } from '../../query';

interface Props {
  savedQuery: SavedQuery;
  onClick: (savedQuery: SavedQuery) => void;
}

export const SavedQueriesItem: FC<Props> = ({ savedQuery, onClick }: Props) => {
  const [ref] = useInnerText();

  return (
    <EuiBadge
      title={savedQuery.attributes.title}
      color="hollow"
      iconType="cross"
      iconSide="right"
      style={{ cursor: 'pointer', padding: '5px' }}
      className={classNames('globalFilterItem')}
      closeButtonProps={{
        // Removing tab focus on close button because the same option can be obtained through the context menu
        // Also, we may want to add a `DEL` keyboard press functionality
        tabIndex: -1,
      }}
      iconOnClick={() => onClick(savedQuery)}
      iconOnClickAriaLabel={i18n.translate('data.filter.filterBar.savedQueryBadgeIconAriaLabel', {
        defaultMessage: 'Remove {title}',
        values: { title: savedQuery.attributes.title },
      })}
      onClickAriaLabel={i18n.translate('data.filter.filterBar.savedQueryBadgeAriaLabel', {
        defaultMessage: 'Selected saved objects actions',
      })}
      // onClick={() => onClick(savedQuery)}
    >
      <strong ref={ref}># {savedQuery.attributes.title}</strong>
    </EuiBadge>
  );
};
