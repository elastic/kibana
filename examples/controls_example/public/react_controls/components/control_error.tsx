/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';

import { EuiButtonEmpty, EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { Markdown } from '@kbn/shared-ux-markdown';

/** TODO: This file is duplicated from the controls plugin to avoid exporting it */

interface ControlErrorProps {
  error: Error | string;
}

export const ControlError = ({ error }: ControlErrorProps) => {
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const errorMessage = error instanceof Error ? error.message : error;

  const popoverButton = (
    <EuiButtonEmpty
      flush="left"
      color="danger"
      iconSize="m"
      iconType="error"
      data-test-subj="control-frame-error"
      onClick={() => setPopoverOpen((open) => !open)}
      className="errorEmbeddableCompact__button controlErrorButton"
      textProps={{ className: 'errorEmbeddableCompact__text' }}
      contentProps={{ className: 'controlErrorButton--content' }}
    >
      <FormattedMessage
        id="controls.frame.error.message"
        defaultMessage="An error occurred. View more"
      />
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      button={popoverButton}
      isOpen={isPopoverOpen}
      className="controlPanel errorEmbeddableCompact__popover"
      closePopover={() => setPopoverOpen(false)}
    >
      <Markdown data-test-subj="errorMessageMarkdown" readOnly>
        {errorMessage}
      </Markdown>
    </EuiPopover>
  );
};
