/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

interface Props {
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  onPageNext: () => void;
  onPagePrevious: () => void;
}

export function ToolBarPagerButtons(props: Props) {
  return (
    <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          display="base"
          iconType="arrowLeft"
          iconSize="m"
          size="xs"
          onClick={() => props.onPagePrevious()}
          isDisabled={!props.hasPreviousPage}
          data-test-subj="btnPrevPage"
          aria-label={i18n.translate(
            'discover.docTable.pager.toolbarPagerButtons.previousButtonAriaLabel',
            {
              defaultMessage: 'Previous page in table',
            }
          )}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          display="base"
          iconType="arrowRight"
          iconSize="m"
          size="xs"
          onClick={() => props.onPageNext()}
          isDisabled={!props.hasNextPage}
          data-test-subj="btnNextPage"
          aria-label={i18n.translate(
            'discover.docTable.pager.toolbarPagerButtons.nextButtonAriaLabel',
            {
              defaultMessage: 'Next page in table',
            }
          )}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
