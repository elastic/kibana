/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

interface Props {
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  onPageNext: () => void;
  onPagePrevious: () => void;
}

export function ToolBarPagerButtons(props: Props) {
  return (
    <div className="kuiButtonGroup">
      <button
        className="kuiButton kuiButton--basic kuiButton--icon"
        onClick={() => props.onPagePrevious()}
        disabled={!props.hasPreviousPage}
        data-test-subj="btnPrevPage"
        aria-label={i18n.translate(
          'discover.docTable.pager.toolbarPagerButtons.previousButtonAriaLabel',
          {
            defaultMessage: 'Previous page in table',
          }
        )}
      >
        <span className="kuiButton__icon kuiIcon fa-chevron-left" />
      </button>
      <button
        className="kuiButton kuiButton--basic kuiButton--icon"
        onClick={() => props.onPageNext()}
        disabled={!props.hasNextPage}
        data-test-subj="btnNextPage"
        aria-label={i18n.translate(
          'discover.docTable.pager.toolbarPagerButtons.nextButtonAriaLabel',
          {
            defaultMessage: 'Next page in table',
          }
        )}
      >
        <span className="kuiButton__icon kuiIcon fa-chevron-right" />
      </button>
    </div>
  );
}
