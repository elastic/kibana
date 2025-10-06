/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, type FC } from 'react';

import { EuiButtonEmpty, EuiPopover } from '@elastic/eui';

import { CodeEditor } from '@kbn/code-editor';

interface EsqlPopoverProps {
  esql: string;
}

export const EsqlPopover: FC<EsqlPopoverProps> = ({ esql }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = () => setIsPopoverOpen((newIsPopoverOpen: boolean) => !newIsPopoverOpen);
  const closePopover = () => setIsPopoverOpen(false);

  const button = (
    <EuiButtonEmpty size="xs" onClick={onButtonClick} color="accentSecondary">
      ES|QL
    </EuiButtonEmpty>
  );

  return (
    <div css={{ position: 'absolute', right: 0, top: 0 }}>
      <EuiPopover
        css={{ padding: 0 }}
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
      >
        <CodeEditor
          width={600}
          height={150}
          languageId="esql"
          options={{
            automaticLayout: true,
            lineNumbers: 'off',
            tabSize: 2,
          }}
          value={esql ?? ''}
        />
      </EuiPopover>
    </div>
  );
};
