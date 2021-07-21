/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
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
import {
  Container,
  EmbeddableInput,
  EmbeddableOutput,
  SavedObjectEmbeddableInput,
  IEmbeddable,
  EmbeddableEditorState,
  EmbeddableStateTransfer,
} from '../..';

interface Props {
  onClose: () => void;
  initialInput: EmbeddableInput;
  embeddable: IEmbeddable<EmbeddableInput, EmbeddableOutput>;
  application: ApplicationStart;
  stateTransferService?: EmbeddableStateTransfer;
}

interface NavigationContext {
  app: string;
  path: string;
  state?: EmbeddableEditorState;
}

export class QuickEditFlyout extends React.Component<Props> {
  private currentAppId: string | undefined;
  private onSave: () => void;

  constructor(props: Props) {
    super(props);

    // temporary no-op
    this.onSave = () => {};

    const { embeddable, application } = this.props;
    if (embeddable.getQuickEditControl) {
      embeddable.getQuickEditControl()?.then(({ control, onSave }) => {
        if (control) {
          render(control, document.getElementById('hello-put-it-here'));
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

  private async goToApp(context: IEmbeddable) {
    const { stateTransferService, application, embeddable, initialInput } = this.props;

    const appTarget = this.getAppTarget(context);
    if (appTarget) {
      // Restore embeddable to original state before navigating away
      embeddable.updateInput(initialInput);

      if (stateTransferService && appTarget.state) {
        await stateTransferService.navigateToEditor(appTarget.app, {
          path: appTarget.path,
          state: appTarget.state,
        });
      } else {
        await application.navigateToApp(appTarget.app, { path: appTarget.path });
      }
      return;
    }

    const href = await this.getHref(context);
    if (href) {
      window.location.href = href;
      return;
    }
  }

  private async getHref(embeddable: IEmbeddable): Promise<string> {
    const editUrl = embeddable ? embeddable.getOutput().editUrl : undefined;
    return editUrl ? editUrl : '';
  }

  private getAppTarget(embeddable: IEmbeddable): NavigationContext | undefined {
    const app = embeddable ? embeddable.getOutput().editApp : undefined;
    const path = embeddable ? embeddable.getOutput().editPath : undefined;
    if (app && path) {
      if (this.currentAppId) {
        const byValueMode = !(embeddable.getInput() as SavedObjectEmbeddableInput).savedObjectId;
        const state: EmbeddableEditorState = {
          originatingApp: this.currentAppId,
          valueInput: byValueMode ? this.getExplicitInput(embeddable) : undefined,
          embeddableId: embeddable.id,
        };
        return { app, path, state };
      }
      return { app, path };
    }
  }

  private getExplicitInput(embeddable: IEmbeddable): EmbeddableInput {
    return (
      (embeddable.getRoot() as Container)?.getInput()?.panels?.[embeddable.id]?.explicitInput ??
      embeddable.getInput()
    );
  }

  public render() {
    const { embeddable, initialInput, onClose } = this.props;

    const title = !embeddable.getTitle() ? 'Edit panel' : `Edit ${embeddable.getTitle()}`;

    const editApp = embeddable.getOutput().editApp;
    return (
      <>
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiTitle size="m">
                <h2>
                  <span>{title}</span>
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiLink
              onClick={() => {
                this.goToApp(embeddable);
                onClose();
              }}
              external={true}
            >
              Open in {editApp}
              <EuiIcon size="s" className="euiLink__externalIcon" type="popout" />
            </EuiLink>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <div style={{ width: '100%', height: '100%' }}>
          <EuiFlexGroup direction="column" style={{ height: '100%' }}>
            <EuiFlexItem grow={true}>
              <div id="hello-put-it-here" style={{ height: '100%' }} />
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
                Cancel
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
                Save
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </>
    );
  }
}
