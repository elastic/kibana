/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import React, { useState, useEffect } from 'react';
import { render } from 'react-dom';
import {
  EuiIcon,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButton,
  EuiButtonEmpty,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiLink,
  EuiForm,
  EuiFieldText,
  EuiFormRow,
} from '@elastic/eui';
import { EmbeddableInput, EmbeddableOutput, IEmbeddable } from '../..';

const EDITOR_CONTAINER_ID = 'kbnQuickEditEditorContainer';

interface Props {
  onSave: (newState: Partial<EmbeddableInput>) => void;
  onCancel: () => void;
  goToApp: () => void;

  embeddable: IEmbeddable<EmbeddableInput, EmbeddableOutput>;

  EditorComponent?: JSX.Element;
}

export function QuickEditFlyout(props: Props) {
  const {
    EditorComponent,
    embeddable,

    onSave,
    onCancel,
    goToApp,
  } = props;

  // Mount the editor component in the tree
  useEffect(() => {
    if (EditorComponent) {
      render(EditorComponent, document.getElementById(EDITOR_CONTAINER_ID));
    }
  }, [EditorComponent]);

  const [input, setInput] = useState({ title: embeddable.getTitle() });

  const enhancedAriaLabel = i18n.translate('embeddableApi.quickEdit.flyout.titleLabel', {
    defaultMessage: 'Edit {title}',
    values: { title: input.title },
  });

  const enhancedAriaNoTitleLabel = i18n.translate('embeddableApi.quickEdit.flyout.noTitleLabel', {
    defaultMessage: 'Edit panel',
  });
  const label = !input.title ? enhancedAriaNoTitleLabel : enhancedAriaLabel;
  const editApp = embeddable.getOutput().editApp;

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2>
                <span>{label}</span>
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiLink
            onClick={() => {
              goToApp();
            }}
            external={true}
          >
            <FormattedMessage
              id="embeddableApi.quickEdit.flyout.openAppLabel"
              defaultMessage="Open in {editApp}"
              values={{ editApp }}
            />
            <EuiIcon size="s" className="euiLink__externalIcon" type="popout" />
          </EuiLink>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm>
          <EuiFormRow label="Panel Title">
            <EuiFieldText
              name="title"
              value={input.title}
              onChange={(e) => {
                setInput({ title: e.currentTarget.value });
              }}
            />
          </EuiFormRow>
        </EuiForm>
        <div style={{ width: '100%', height: '100%' }}>
          <EuiFlexGroup direction="column" style={{ height: '100%' }}>
            <EuiFlexItem grow={true}>
              <div id={EDITOR_CONTAINER_ID} style={{ height: '100%' }} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              onClick={() => {
                onCancel();
              }}
              flush="left"
            >
              <FormattedMessage
                id="embeddableApi.quickEdit.flyout.cancelLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={() => {
                onSave(input);
              }}
              fill
            >
              <FormattedMessage
                id="embeddableApi.quickEdit.flyout.saveLabel"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
}
