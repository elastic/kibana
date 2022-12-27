/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';

import {
  EuiFormRow,
  EuiFieldText,
  EuiSwitch,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiForm,
  EuiTextArea,
  EuiFlyoutFooter,
  EuiButtonEmpty,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { IEmbeddable, EmbeddableInput } from '../../../..';

interface CustomizePanelProps {
  embeddable: IEmbeddable;
  updateInput: (input: Partial<EmbeddableInput>) => void;
  cancel: () => void;
}

export const CustomizePanelEditor = (props: CustomizePanelProps) => {
  const { cancel, updateInput } = props;
  const [hideTitle, setHideTitle] = useState(props.embeddable.getInput().hidePanelTitles);
  const [description, setDescription] = useState(
    props.embeddable.getInput().description ?? props.embeddable.getOutput().defaultDescription
  );
  const [title, setTitle] = useState(
    props.embeddable.getInput().title ?? props.embeddable.getOutput().defaultTitle
  );

  const save = () => {
    const newTitle = title === props.embeddable.getOutput().defaultTitle ? undefined : title;
    const newDescription =
      description === props.embeddable.getOutput().defaultDescription ? undefined : description;
    updateInput({ title: newTitle, hidePanelTitles: hideTitle, description: newDescription });
  };

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="embeddableApi.customizePanel.flyout.title"
              defaultMessage="Customize panel"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm>
          <EuiFormRow>
            <EuiSwitch
              checked={!hideTitle}
              data-test-subj="customizePanelHideTitle"
              id="hideTitle"
              label={
                <FormattedMessage
                  defaultMessage="Show panel title"
                  id="embeddableApi.customizePanel.flyout.optionsMenuForm.showTitle"
                />
              }
              onChange={(e) => setHideTitle(!e.target.checked)}
            />
          </EuiFormRow>
          <EuiFormRow
            label={
              <FormattedMessage
                id="embeddableApi.customizePanel.flyout.optionsMenuForm.panelTitleFormRowLabel"
                defaultMessage="Panel title"
              />
            }
            labelAppend={
              <EuiButtonEmpty
                size="xs"
                data-test-subj="resetCustomEmbeddablePanelTitle"
                onClick={() => setTitle(props.embeddable.getOutput().defaultTitle ?? '')}
                disabled={hideTitle}
                aria-label={i18n.translate(
                  'embeddableApi.customizePanel.flyout.optionsMenuForm.resetCustomTitleButtonAriaLabel',
                  {
                    defaultMessage: 'Reset panel title',
                  }
                )}
              >
                <FormattedMessage
                  id="embeddableApi.customizePanel.flyout.optionsMenuForm.resetCustomTitleButtonLabel"
                  defaultMessage="Reset"
                />
              </EuiButtonEmpty>
            }
          >
            <EuiFieldText
              id="panelTitleInput"
              className="panelTitleInputText"
              data-test-subj="customEmbeddablePanelTitleInput"
              name="title"
              type="text"
              disabled={hideTitle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label={i18n.translate(
                'embeddableApi.customizePanel.flyout.optionsMenuForm.panelTitleInputAriaLabel',
                {
                  defaultMessage: 'Enter a custom title for your panel',
                }
              )}
            />
          </EuiFormRow>
          <EuiFormRow
            label={
              <FormattedMessage
                id="embeddableApi.customizePanel.flyout.optionsMenuForm.panelDescriptionFormRowLabel"
                defaultMessage="Panel description"
              />
            }
            labelAppend={
              <EuiButtonEmpty
                size="xs"
                data-test-subj="resetCustomEmbeddablePanelTitle"
                onClick={() =>
                  setDescription(props.embeddable.getOutput().defaultDescription ?? '')
                }
                disabled={hideTitle}
                aria-label={i18n.translate(
                  'embeddableApi.customizePanel.flyout.optionsMenuForm.resetCustomDescriptionButtonAriaLabel',
                  {
                    defaultMessage: 'Reset panel description',
                  }
                )}
              >
                <FormattedMessage
                  id="embeddableApi.customizePanel.modal.optionsMenuForm.resetCustomDescriptionButtonLabel"
                  defaultMessage="Reset"
                />
              </EuiButtonEmpty>
            }
          >
            <EuiTextArea
              id="panelDescriptionInput"
              className="panelDescriptionInputText"
              data-test-subj="customEmbeddablePanelDescriptionInput"
              disabled={hideTitle}
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-label={i18n.translate(
                'embeddableApi.customizePanel.flyout.optionsMenuForm.panelDescriptionAriaLabel',
                {
                  defaultMessage: 'Enter a description for your panel',
                }
              )}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={cancel}>
              <FormattedMessage
                id="embeddableApi.customizePanel.flyout.cancel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton data-test-subj="saveNewTitleButton" onClick={save} fill>
              <FormattedMessage
                id="embeddableApi.customizePanel.flyout.saveButtonTitle"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );

  // return (
  //   <EuiFocusTrap clickOutsideDisables={true} initialFocus={'.panelTitleInputText'}>
  //     <EuiOutsideClickDetector onOutsideClick={this.props.cancel}>
  //       <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="euiModal__flex">
  //         <form
  //           onSubmit={(event: FormEvent) => {
  //             event.preventDefault();
  //             this.save();
  //           }}
  //         >
  //           <EuiModalHeader>
  //             <EuiModalHeaderTitle data-test-subj="customizePanelTitle">
  //               <h2 id={titleId}>Customize panel</h2>
  //             </EuiModalHeaderTitle>
  //           </EuiModalHeader>

  //           <EuiModalBody>
  //             <EuiFormRow>
  //               <EuiSwitch
  //                 checked={!this.state.hideTitle}
  //                 data-test-subj="customizePanelHideTitle"
  //                 id="hideTitle"
  //                 label={
  //                   <FormattedMessage
  //                     defaultMessage="Show panel title"
  //                     id="embeddableApi.customizePanel.flyout.showTitle"
  //                   />
  //                 }
  //                 onChange={this.onHideTitleToggle}
  //               />
  //             </EuiFormRow>
  //             <EuiFormRow
  //               label={i18n.translate(
  //                 'embeddableApi.customizePanel.flyout.optionsMenuForm.panelTitleFormRowLabel',
  //                 {
  //                   defaultMessage: 'Panel title',
  //                 }
  //               )}
  //             >
  //               <EuiFieldText
  //                 id="panelTitleInput"
  //                 className="panelTitleInputText"
  //                 data-test-subj="customEmbeddablePanelTitleInput"
  //                 name="min"
  //                 type="text"
  //                 disabled={this.state.hideTitle}
  //                 value={this.state.title || ''}
  //                 onChange={(e) => this.setState({ title: e.target.value })}
  //                 aria-label={i18n.translate(
  //                   'embeddableApi.customizePanel.flyout.optionsMenuForm.panelTitleInputAriaLabel',
  //                   {
  //                     defaultMessage: 'Enter a custom title for your panel',
  //                   }
  //                 )}
  //                 append={
  //                   <EuiButtonEmpty
  //                     data-test-subj="resetCustomEmbeddablePanelTitle"
  //                     onClick={this.reset}
  //                     disabled={this.state.hideTitle}
  //                   >
  //                     <FormattedMessage
  //                       id="embeddableApi.customizePanel.flyout.optionsMenuForm.resetCustomDashboardButtonLabel"
  //                       defaultMessage="Reset"
  //                     />
  //                   </EuiButtonEmpty>
  //                 }
  //               />
  //             </EuiFormRow>
  //           </EuiModalBody>
  //           <EuiModalFooter>
  //             <EuiButtonEmpty onClick={() => this.props.cancel()}>
  //               <FormattedMessage
  //                 id="embeddableApi.customizePanel.flyout.cancel"
  //                 defaultMessage="Cancel"
  //               />
  //             </EuiButtonEmpty>

  //             <EuiButton data-test-subj="saveNewTitleButton" onClick={this.save} fill>
  //               <FormattedMessage
  //                 id="embeddableApi.customizePanel.flyout.saveButtonTitle"
  //                 defaultMessage="Save"
  //               />
  //             </EuiButton>
  //           </EuiModalFooter>
  //         </form>
  //       </div>
  //     </EuiOutsideClickDetector>
  //   </EuiFocusTrap>
  // );
};
