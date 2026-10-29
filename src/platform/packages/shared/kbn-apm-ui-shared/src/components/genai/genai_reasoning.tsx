/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiAccordion, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { GenAiFieldValue } from './genai_field_value';

const REASONING_LABEL = i18n.translate('apmUiShared.genAi.messages.reasoning', {
  defaultMessage: 'Reasoning',
});

interface Props {
  content: string;
}

/** Renders a reasoning part as plain text, collapsed by default since it can be very long. */
export function GenAiReasoning({ content }: Props) {
  const accordionId = useGeneratedHtmlId({ prefix: 'genAiReasoning' });

  return (
    <EuiAccordion
      id={accordionId}
      buttonContent={REASONING_LABEL}
      paddingSize="s"
      data-test-subj="genAiReasoningPart"
    >
      <GenAiFieldValue value={content} />
    </EuiAccordion>
  );
}
