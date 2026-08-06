/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import type { GenAiMessage } from './get_genai_fields';
import { GenAiFieldValue } from './genai_field_value';

interface Props {
  message: GenAiMessage;
}

export function GenAiMessageContent({ message }: Props) {
  // Newer schema: parts array
  if (Array.isArray(message.parts) && message.parts.length > 0) {
    return (
      <>
        {message.parts.map((part, i) => (
          <React.Fragment key={i}>
            {i > 0 && <EuiSpacer size="s" />}
            <GenAiFieldValue value={part.type === 'text' ? part.content ?? '' : part} />
          </React.Fragment>
        ))}
      </>
    );
  }

  // Legacy / simple schema: content string or object
  return <GenAiFieldValue value={message.content ?? message} />;
}
