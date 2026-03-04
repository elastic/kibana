/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  htmlIdGenerator,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { InlineEditingProps } from './saved_search_grid';

interface InlineEditFooterProps {
  inlineEditing: InlineEditingProps;
}

export const INLINE_EDIT_FOOTER_HELP_TEXT = htmlIdGenerator()('discoverInlineEditFooterHelp');

export const InlineEditFooter = ({ inlineEditing }: InlineEditFooterProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      responsive={false}
      gutterSize="s"
      justifyContent="flexEnd"
      css={{
        padding: euiTheme.size.s,
        borderTop: euiTheme.border.thin,
      }}
    >
      <p id={INLINE_EDIT_FOOTER_HELP_TEXT} hidden>
        {i18n.translate('discover.embeddable.inlineEdit.footerHelpText', {
          defaultMessage: 'Press Apply to save your changes or Discard to cancel.',
        })}
      </p>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="s"
          color="primary"
          data-test-subj="discoverEmbeddableInlineEditDiscardButton"
          css={{ minInlineSize: 'initial' }}
          onClick={() => {
            void inlineEditing.onCancel();
          }}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Escape') {
              void inlineEditing.onCancel();
            }
          }}
        >
          {i18n.translate('discover.embeddable.inlineEdit.discardButton', {
            defaultMessage: 'Discard',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          color="primary"
          fill
          data-test-subj="discoverEmbeddableInlineEditApplyButton"
          css={{ minInlineSize: 'initial' }}
          onClick={() => {
            void inlineEditing.onApply();
          }}
          disabled={!inlineEditing.hasPendingChanges}
        >
          {i18n.translate('discover.embeddable.inlineEdit.applyButton', {
            defaultMessage: 'Apply',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
