/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiAccordion, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { importJsonFlyoutStrings } from './import_json_strings';
import { useScrollableListStyles } from './use_scrollable_list_styles';

interface ImportJsonErrorDetailsProps {
  dataTestSubjPrefix: string;
  details: string;
}

export const ImportJsonErrorDetails = ({
  dataTestSubjPrefix,
  details,
}: ImportJsonErrorDetailsProps) => {
  const detailsStyles = useScrollableListStyles();
  const accordionId = useGeneratedHtmlId({ prefix: `${dataTestSubjPrefix}ServerErrorDetails` });
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <EuiAccordion
      id={accordionId}
      initialIsOpen={false}
      onToggle={setIsExpanded}
      paddingSize="s"
      buttonContent={
        isExpanded
          ? importJsonFlyoutStrings.getWarningsAccordionHide()
          : importJsonFlyoutStrings.getWarningsAccordionShow()
      }
      data-test-subj={`${dataTestSubjPrefix}ServerErrorDetailsAccordion`}
    >
      {isExpanded ? (
        <EuiText
          size="s"
          data-test-subj={`${dataTestSubjPrefix}ServerErrorDetails`}
          css={detailsStyles}
        >
          {details}
        </EuiText>
      ) : null}
    </EuiAccordion>
  );
};
