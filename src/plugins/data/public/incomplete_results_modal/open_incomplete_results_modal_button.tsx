/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink, EuiButton, EuiButtonProps } from '@elastic/eui';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ThemeServiceStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { getOverlays } from '../services';
import type { SearchRequest } from '..';
import { IncompleteResultsModal } from './incomplete_results_modal';
import type { SearchResponseIncompleteWarning } from '../search';
import './_incomplete_results_modal.scss';

// @internal
export interface OpenIncompleteResultsModalButtonProps {
  theme: ThemeServiceStart;
  warning: SearchResponseIncompleteWarning;
  size?: EuiButtonProps['size'];
  color?: EuiButtonProps['color'];
  getRequestMeta: () => {
    request: SearchRequest;
    response: estypes.SearchResponse<any>;
  };
  isButtonEmpty?: boolean;
}

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default function OpenIncompleteResultsModalButton({
  getRequestMeta,
  theme,
  warning,
  size = 's',
  color = 'warning',
  isButtonEmpty = false,
}: OpenIncompleteResultsModalButtonProps) {
  const onClick = useCallback(() => {
    const { request, response } = getRequestMeta();
    const modal = getOverlays().openModal(
      toMountPoint(
        <IncompleteResultsModal
          request={request}
          response={response}
          warning={warning}
          onClose={() => modal.close()}
        />,
        { theme$: theme.theme$ }
      ),
      {
        className: 'incompleteResultsModal',
      }
    );
  }, [getRequestMeta, theme.theme$, warning]);

  const Component = isButtonEmpty ? EuiLink : EuiButton;

  return (
    <Component
      color={color}
      size={size}
      onClick={onClick}
      data-test-subj="openIncompleteResultsModalBtn"
    >
      <FormattedMessage
        id="data.search.searchSource.fetch.incompleteResultsModal.viewDetails"
        defaultMessage="View details"
        description="Open the modal to show details"
      />
    </Component>
  );
}
