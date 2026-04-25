/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useContentListConfig } from '@kbn/content-list-provider';

export interface EmptyStateProps {
  /**
   * Custom title for the empty state.
   */
  title?: string;
  /**
   * Custom body text for the empty state.
   */
  body?: string;
}

/**
 * Default empty state component for when there are no items.  We will expect to iterate/replace this component.
 */
export const EmptyState = ({ title, body }: EmptyStateProps) => {
  const {
    labels: { entityPlural },
  } = useContentListConfig();

  const defaultTitle = i18n.translate('contentManagement.contentList.table.emptyState.title', {
    defaultMessage: 'No {entityPlural} found',
    values: { entityPlural },
  });

  const defaultBody = i18n.translate('contentManagement.contentList.table.emptyState.body', {
    defaultMessage: 'There are no {entityPlural} to display.',
    values: { entityPlural },
  });

  return (
    <EuiEmptyPrompt
      iconType="documents"
      title={<h2>{title ?? defaultTitle}</h2>}
      body={<p>{body ?? defaultBody}</p>}
      data-test-subj="content-list-table-empty-state"
    />
  );
};
