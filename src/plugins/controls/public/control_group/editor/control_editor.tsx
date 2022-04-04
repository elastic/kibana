/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import {
  EuiFlyoutHeader,
  EuiButtonGroup,
  EuiFlyoutBody,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiFieldText,
  EuiFlyoutFooter,
  EuiButton,
  EuiFormRow,
  EuiForm,
  EuiButtonEmpty,
  EuiSpacer,
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui';

import { ControlGroupStrings } from '../control_group_strings';
import {
  ControlEmbeddable,
  ControlInput,
  ControlWidth,
  IEditableControlFactory,
} from '../../types';
import { CONTROL_WIDTH_OPTIONS } from './editor_constants';
import { pluginServices } from '../../services';
import { EmbeddableFactoryDefinition } from '../../../../embeddable/public';

interface EditControlProps {
  embeddable?: ControlEmbeddable;
  isCreate: boolean;
  title?: string;
  width: ControlWidth;
  onSave: (type: string) => void;
  onCancel: () => void;
  removeControl?: () => void;
  updateTitle: (title?: string) => void;
  updateWidth: (newWidth: ControlWidth) => void;
  getRelevantDataViewId?: () => string | undefined;
  setLastUsedDataViewId?: (newDataViewId: string) => void;
  onTypeEditorChange: (partial: Partial<ControlInput>) => void;
}

export const ControlEditor = ({
  embeddable,
  isCreate,
  title,
  width,
  onSave,
  onCancel,
  removeControl,
  updateTitle,
  updateWidth,
  onTypeEditorChange,
  getRelevantDataViewId,
  setLastUsedDataViewId,
}: EditControlProps) => {
  const { controls } = pluginServices.getServices();
  const { getControlTypes, getControlFactory } = controls;

  const [selectedType, setSelectedType] = useState(
    !isCreate && embeddable ? embeddable.type : getControlTypes()[0]
  );
  const [defaultTitle, setDefaultTitle] = useState<string>();
  const [currentTitle, setCurrentTitle] = useState(title);
  const [currentWidth, setCurrentWidth] = useState(width);
  const [controlEditorValid, setControlEditorValid] = useState(false);

  const getControlTypeEditor = (type: string) => {
    const factory = getControlFactory(type);
    const ControlTypeEditor = (factory as IEditableControlFactory).controlEditorComponent;
    return ControlTypeEditor ? (
      <ControlTypeEditor
        getRelevantDataViewId={getRelevantDataViewId}
        setLastUsedDataViewId={setLastUsedDataViewId}
        onChange={onTypeEditorChange}
        setValidState={setControlEditorValid}
        initialInput={embeddable?.getInput()}
        setDefaultTitle={(newDefaultTitle) => {
          if (!currentTitle || currentTitle === defaultTitle) {
            setCurrentTitle(newDefaultTitle);
            updateTitle(newDefaultTitle);
          }
          setDefaultTitle(newDefaultTitle);
        }}
      />
    ) : null;
  };

  const getTypeButtons = (controlTypes: string[]) => {
    return controlTypes.map((type) => {
      const factory = getControlFactory(type);
      const icon = (factory as EmbeddableFactoryDefinition).getIconType?.();
      const tooltip = (factory as EmbeddableFactoryDefinition).getDescription?.();
      const menuPadItem = (
        <EuiKeyPadMenuItem
          id={`createControlButton_${type}`}
          data-test-subj={`create-${type}-control`}
          label={(factory as EmbeddableFactoryDefinition).getDisplayName()}
          isSelected={selectedType === type}
          onClick={() => {
            setSelectedType(type);
          }}
        >
          <EuiIcon type={!icon || icon === 'empty' ? 'controlsHorizontal' : icon} size="l" />
        </EuiKeyPadMenuItem>
      );

      return tooltip ? (
        <EuiToolTip content={tooltip} position="top">
          {menuPadItem}
        </EuiToolTip>
      ) : (
        menuPadItem
      );
    });
  };

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {isCreate
              ? ControlGroupStrings.manageControl.getFlyoutCreateTitle()
              : ControlGroupStrings.manageControl.getFlyoutEditTitle()}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody data-test-subj="control-editor-flyout">
        <EuiForm>
          <EuiFormRow label={ControlGroupStrings.manageControl.getControlTypeTitle()}>
            <EuiKeyPadMenu>
              {isCreate ? getTypeButtons(getControlTypes()) : getTypeButtons([selectedType])}
            </EuiKeyPadMenu>
          </EuiFormRow>
          {selectedType && (
            <>
              {getControlTypeEditor(selectedType)}
              <EuiFormRow label={ControlGroupStrings.manageControl.getTitleInputTitle()}>
                <EuiFieldText
                  data-test-subj="control-editor-title-input"
                  placeholder={defaultTitle}
                  value={currentTitle}
                  onChange={(e) => {
                    updateTitle(e.target.value || defaultTitle);
                    setCurrentTitle(e.target.value);
                  }}
                />
              </EuiFormRow>
              <EuiFormRow label={ControlGroupStrings.manageControl.getWidthInputTitle()}>
                <EuiButtonGroup
                  color="primary"
                  legend={ControlGroupStrings.management.controlWidth.getWidthSwitchLegend()}
                  options={CONTROL_WIDTH_OPTIONS}
                  idSelected={currentWidth}
                  onChange={(newWidth: string) => {
                    setCurrentWidth(newWidth as ControlWidth);
                    updateWidth(newWidth as ControlWidth);
                  }}
                />
              </EuiFormRow>
              <EuiSpacer size="l" />
              {removeControl && (
                <EuiButtonEmpty
                  aria-label={`delete-${title}`}
                  iconType="trash"
                  flush="left"
                  color="danger"
                  onClick={() => {
                    onCancel();
                    removeControl();
                  }}
                >
                  {ControlGroupStrings.management.getDeleteButtonTitle()}
                </EuiButtonEmpty>
              )}
            </>
          )}
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              aria-label={`cancel-${title}`}
              data-test-subj="control-editor-cancel"
              iconType="cross"
              onClick={() => onCancel()}
            >
              {ControlGroupStrings.manageControl.getCancelTitle()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              aria-label={`save-${title}`}
              data-test-subj="control-editor-save"
              iconType="check"
              color="primary"
              disabled={!controlEditorValid}
              onClick={() => onSave(selectedType)}
            >
              {ControlGroupStrings.manageControl.getSaveChangesTitle()}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
