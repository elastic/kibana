/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useContentListConfig } from '@kbn/content-list-provider';

/**
 * Props for the {@link CreateButton} component.
 */
export interface CreateButtonProps {
  /** Optional label override. Defaults to "Create {entityName}". */
  label?: React.ReactNode;
  /** Optional icon type. Defaults to "plusInCircleFilled". */
  iconType?: string;
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

/**
 * `CreateButton` component.
 *
 * Renders a create button that triggers the `onCreate` handler from `globalActions`.
 * Only renders when `globalActions.onCreate` is configured in the provider.
 *
 * @param props - The component props. See {@link CreateButtonProps}.
 * @returns A React element containing the create button, or `null` if `onCreate` is not configured.
 *
 * @example
 * ```tsx
 * // Default usage - uses entityName from provider
 * <CreateButton />
 *
 * // Custom label
 * <CreateButton label="New Dashboard" />
 * ```
 */
export const CreateButton = ({
  label,
  iconType = 'plusInCircleFilled',
  'data-test-subj': dataTestSubj = 'contentListCreateButton',
}: CreateButtonProps) => {
  const { features, entityName, isReadOnly } = useContentListConfig();
  const onCreate = features.globalActions?.onCreate;

  // Don't render if onCreate is not configured or in read-only mode.
  if (!onCreate || isReadOnly) {
    return null;
  }

  return (
    <EuiButton onClick={onCreate} iconType={iconType} fill data-test-subj={dataTestSubj}>
      {label ?? (
        <FormattedMessage
          id="contentManagement.contentList.toolbar.createButton"
          defaultMessage="Create {entityName}"
          values={{ entityName }}
        />
      )}
    </EuiButton>
  );
};
