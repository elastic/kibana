/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiPanel,
  EuiPopover,
  EuiPopoverTitle,
  EuiCode,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface SyntaxExample {
  label: string;
  example: string;
}

export interface SyntaxExamples {
  title: string;
  footer: React.ReactElement;
  items: SyntaxExample[];
}

export interface SyntaxSuggestionsPopoverProps {
  meta: SyntaxExamples;
}

export const SyntaxSuggestionsPopover: React.FC<SyntaxSuggestionsPopoverProps> = ({ meta }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { title, items, footer } = meta;

  const helpButton = (
    <EuiButtonIcon
      onClick={() => setIsOpen((prev) => !prev)}
      iconType="documentation"
      aria-label={title}
    />
  );

  const columns = [
    {
      field: 'label',
      name: i18n.translate('discover.noResults.suggestion.syntaxPopoverDescriptionHeader', {
        defaultMessage: 'Description',
      }),
      width: '200px',
    },
    {
      field: 'example',
      name: i18n.translate('discover.noResults.suggestion.syntaxPopoverExampleHeader', {
        defaultMessage: 'Example',
      }),
      render: (example: string) => <EuiCode>{example}</EuiCode>,
    },
  ];

  return (
    <EuiPopover
      button={helpButton}
      isOpen={isOpen}
      display="inlineBlock"
      panelPaddingSize="none"
      closePopover={() => setIsOpen(false)}
      initialFocus="#querySyntaxBasicTableId"
    >
      <EuiPopoverTitle paddingSize="s">{title}</EuiPopoverTitle>
      <EuiPanel
        className="eui-yScroll"
        css={css`
          max-height: 40vh;
          max-width: 500px;
        `}
        color="transparent"
        paddingSize="s"
      >
        <EuiBasicTable<SyntaxExample>
          id="querySyntaxBasicTableId"
          tableCaption={title}
          items={items}
          compressed={true}
          rowHeader="label"
          columns={columns}
        />
      </EuiPanel>
      <EuiPanel color="transparent" paddingSize="s">
        <EuiText size="s">{footer}</EuiText>
        <EuiSpacer size="xs" />
      </EuiPanel>
    </EuiPopover>
  );
};
