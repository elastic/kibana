/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactNode } from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useContentListConfig, useIsEmpty } from '@kbn/content-list-provider';

export interface ContentListEmptyStatePrimaryAction {
  label: ReactNode;
  onClick: () => void;
  iconType?: string;
  disabled?: boolean;
  'data-test-subj'?: string;
}

export interface ContentListEmptyStateProps {
  iconType?: string;
  title?: ReactNode;
  body?: ReactNode;
  primaryAction?: ContentListEmptyStatePrimaryAction;
  secondaryAction?: ReactNode;
  'data-test-subj'?: string;
}

/**
 * Provider-aware empty state component for Content List.
 *
 * `<ContentList>` uses this component as its default empty rendering. Pass it
 * as `emptyState` when you need custom copy or actions.
 */
export const ContentListEmptyState = ({
  iconType = 'documents',
  title,
  body,
  primaryAction,
  secondaryAction,
  'data-test-subj': dataTestSubj = 'content-list-empty-state',
}: ContentListEmptyStateProps) => {
  const isEmpty = useIsEmpty();
  const {
    labels: { entity, entityPlural },
  } = useContentListConfig();

  if (!isEmpty) {
    return null;
  }

  const defaultTitle = i18n.translate('contentManagement.contentList.emptyState.title', {
    defaultMessage: 'No {entityPlural} yet',
    values: { entityPlural },
  });

  const defaultBody = i18n.translate('contentManagement.contentList.emptyState.body', {
    defaultMessage: 'Create your first {entity} to get started.',
    values: { entity },
  });

  const actions = primaryAction ? (
    <>
      <EuiButton
        fill
        iconType={primaryAction.iconType ?? 'plusInCircle'}
        onClick={primaryAction.onClick}
        disabled={primaryAction.disabled}
        data-test-subj={primaryAction['data-test-subj'] ?? `${dataTestSubj}-primaryAction`}
      >
        {primaryAction.label}
      </EuiButton>
      {secondaryAction}
    </>
  ) : (
    secondaryAction ?? undefined
  );

  const isPrimitive = (node: ReactNode): node is string | number =>
    typeof node === 'string' || typeof node === 'number';

  const resolvedTitle = title ?? defaultTitle;
  const resolvedBody = body ?? defaultBody;

  // `<h2>` so this empty state can co-exist with a page-level `<h1>` (e.g.,
  // the page title rendered by `KibanaContentListPage`). Consumers that need a
  // different level can pass a fully formed `title` ReactNode.
  const titleNode = isPrimitive(resolvedTitle) ? <h2>{resolvedTitle}</h2> : <>{resolvedTitle}</>;
  const bodyNode = isPrimitive(resolvedBody) ? <p>{resolvedBody}</p> : <>{resolvedBody}</>;

  return (
    <EuiEmptyPrompt
      iconType={iconType}
      title={titleNode}
      body={bodyNode}
      actions={actions}
      data-test-subj={dataTestSubj}
    />
  );
};
