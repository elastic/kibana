/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import React from 'react';
import { render } from 'react-dom';
import { take } from 'rxjs/operators';
import { ApplicationStart } from 'kibana/public';
import {
  EuiIcon,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButton,
  EuiButtonEmpty,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiTitle,
  EuiLink,
} from '@elastic/eui';
import { EmbeddableInput, EmbeddableOutput, IEmbeddable, EmbeddableStateTransfer } from '../..';
import { goToApp } from '../../lib/go_to_app';

const EDITOR_CONTAINER_ID = 'kbnQuickEditEditorContainer';

interface Props {
  onClose: () => void;
  initialInput: EmbeddableInput;
  embeddable: IEmbeddable<EmbeddableInput, EmbeddableOutput>;
  application: ApplicationStart;
  stateTransferService?: EmbeddableStateTransfer;
}

export class QuickEditFlyout extends React.Component<Props> {
  private currentAppId: string | undefined;
  private onSave: () => void;

  constructor(props: Props) {
    super(props);

    // temporary no-op
    this.onSave = () => {};

    const { embeddable, application } = this.props;
    if (embeddable.getQuickEditor) {
      embeddable.getQuickEditor()?.then(({ component, onSave }) => {
        if (component) {
          render(component, document.getElementById(EDITOR_CONTAINER_ID));
        }

        this.onSave = onSave;
      });
    }

    if (application?.currentAppId$) {
      application.currentAppId$
        .pipe(take(1))
        .subscribe((appId: string | undefined) => (this.currentAppId = appId));
    }
  }

  public render() {
    const { embeddable, stateTransferService, application, initialInput, onClose } = this.props;

    const enhancedAriaLabel = i18n.translate('embeddableApi.quickEdit.flyout.titleLabel', {
      defaultMessage: 'Edit {title}',
      values: { title: embeddable.getTitle() },
    });

    const enhancedAriaNoTitleLabel = i18n.translate('embeddableApi.quickEdit.flyout.noTitleLabel', {
      defaultMessage: 'Edit panel',
    });
    const label = !embeddable.getTitle() ? enhancedAriaNoTitleLabel : enhancedAriaLabel;

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
                // Restore embeddable to original state before navigating away
                embeddable.updateInput(initialInput);

                goToApp(embeddable, this.currentAppId || '', { stateTransferService, application });
                onClose();
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
        <div style={{ width: '100%', height: '100%' }}>
          <EuiFlexGroup direction="column" style={{ height: '100%' }}>
            <EuiFlexItem grow={true}>
              <div id={EDITOR_CONTAINER_ID} style={{ height: '100%' }} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="cross"
                onClick={() => {
                  // Restore embeddable state if we cancel
                  embeddable.updateInput(initialInput);
                  embeddable.reload();

                  onClose();
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
                  this.onSave();
                  onClose();
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
}
