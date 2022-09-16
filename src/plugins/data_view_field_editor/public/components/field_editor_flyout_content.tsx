/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiCheckbox,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { euiFlyoutClassname } from '../constants';
import type { Field } from '../types';
import { ModifiedFieldModal, SaveFieldTypeOrNameChangedModal } from './confirm_modals';

import { FieldEditor, FieldEditorFormState } from './field_editor/field_editor';
import { useFieldEditorContext } from './field_editor_context';
import { FlyoutPanels } from './flyout_panels';
import { FieldPreview, useFieldPreviewContext } from './preview';
import {EuiSelectOption} from "@elastic/eui/src/components/form/select/select";

const i18nTexts = {
  cancelButtonLabel: i18n.translate('indexPatternFieldEditor.editor.flyoutCancelButtonLabel', {
    defaultMessage: 'Cancel',
  }),
  saveButtonLabel: i18n.translate('indexPatternFieldEditor.editor.flyoutSaveButtonLabel', {
    defaultMessage: 'Save',
  }),
};

const defaultModalVisibility = {
  confirmChangeNameOrType: false,
  confirmUnsavedChanges: false,
};

export interface Props {
  /**
   * Handler for the "save" footer button
   */
  onSave: (field: Field) => void;
  /**
   * Handler for the "cancel" footer button
   */
  onCancel: () => void;
  /** Optional field to process */
  fieldToEdit?: Field;
  /** Optional preselected configuration for new field */
  fieldToCreate?: Field;
  isSavingField: boolean;
  /** Handler to call when the component mounts.
   *  We will pass "up" data that the parent component might need
   */
  onMounted?: (args: { canCloseValidator: () => boolean }) => void;
}

const FieldEditorFlyoutContentComponent = ({
  fieldToEdit,
  fieldToCreate,
  onSave,
  onCancel,
  isSavingField,
  onMounted,
}: Props) => {
  const isMounted = useRef(false);
  const isEditingExistingField = !!fieldToEdit;
  const { dataView, subfields$, services } = useFieldEditorContext();

  const {
    panel: { isVisible: isPanelVisible },
  } = useFieldPreviewContext();

  const getMatchingIndexTemplates = async (title: string) => {
    const allIndexTemplates: any = await services.http.fetch({
      path: `/api/index_management/index_templates`,
      method: 'get',
    });
    const matchingTemplates = allIndexTemplates.templates.filter(t => t.indexPatterns.includes(title)).map((t: any) => {
      return {
        text: t.name,
      } as EuiSelectOption;
    });
    setMatchingTemplates(matchingTemplates);
  };

  const getIndexTemplate = async (title: string) => {
    const indexTemplate = await services.http.fetch({
      path: `/api/index_management/index_templates/${encodeURIComponent(title)}`,
      method: 'get',
    });
    return indexTemplate as any;
  };

  const saveIndexTemplate = async (name: string, template: any) => {
    const result = await services.http.fetch({
      path: `/api/index_management/index_templates/${encodeURIComponent(name)}`,
      method: 'put',
      body: JSON.stringify(template),
    });
    return result;
  };

  const saveMappings = async (name: string, template: any) => {
    const result = await services.http.fetch({
      path: `/api/index_management/mapping/${encodeURIComponent(name)}`,
      method: 'put',
      body: JSON.stringify(template),
    });
    return result;
  };

  const updateMappings = (mappings: any, myData: any, ingest: boolean) => {
    if (!ingest) {
      if (!mappings.runtime) mappings.runtime = {};
      mappings.runtime[myData?.name] = {
        script: myData?.script,
        type: myData?.type,
      };
    } else {
      if (!mappings.properties) mappings.properties = {};
      mappings.properties[myData?.name] = {
        script: myData?.script,
        type: myData?.type,
      };
    }
  };

  const [formState, setFormState] = useState<FieldEditorFormState>({
    isSubmitted: false,
    isSubmitting: false,
    isValid: fieldToEdit ? true : undefined,
    submit: fieldToEdit
      ? async () => ({ isValid: true, data: fieldToEdit })
      : async () => ({ isValid: false, data: {} as Field }),
  });

  const [ingest, setIngest] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const [matchingTemplates, setMatchingTemplates] = useState([]);
  const [modalVisibility, setModalVisibility] = useState(defaultModalVisibility);
  const [isFormModified, setIsFormModified] = useState(false);
  const [isPromoteVisible, setIsPromoteVisible] = useState(false);

  const { submit, isValid: isFormValid, isSubmitting } = formState;
  const hasErrors = isFormValid === false;

  const canCloseValidator = useCallback(() => {
    if (isFormModified) {
      setModalVisibility({
        ...defaultModalVisibility,
        confirmUnsavedChanges: true,
      });
    }
    return !isFormModified;
  }, [isFormModified]);

  const [myData, setMyData] = useState();
  const onClickPromote = useCallback(async () => {
    if (!isPromoteVisible) {
      const { data } = await submit();
      setMyData(data);
      setIsPromoteVisible(true);
    }
    else {
      // do the promotion

      const indexTemplate = await getIndexTemplate(selectedTemplate);
      if (!indexTemplate.template.mappings) indexTemplate.template.mappings = {};
      updateMappings(indexTemplate.template.mappings, myData, ingest);

      const mapping = {};
      updateMappings(mapping, myData, ingest);

      try {
        await saveIndexTemplate(selectedTemplate, indexTemplate);
        await saveMappings(indexTemplate.indexPatterns[0], mapping);
        onSave({ promoted: true });
      } catch (e) {
        console.log(e);
      }
    }
  }, [setIsPromoteVisible, isPromoteVisible, selectedTemplate, ingest, submit, fieldToEdit, fieldToCreate]);

  const onClickSave = useCallback(async () => {
    const { isValid, data: updatedField } = await submit();

    if (!isMounted.current) {
      // User has closed the flyout meanwhile submitting the form
      return;
    }

    if (isValid) {
      const nameChange = fieldToEdit?.name !== updatedField.name;
      const typeChange = fieldToEdit?.type !== updatedField.type;

      if (isEditingExistingField && (nameChange || typeChange)) {
        setModalVisibility({
          ...defaultModalVisibility,
          confirmChangeNameOrType: true,
        });
      } else {
        if (updatedField.type === 'composite') {
          onSave({ ...updatedField, fields: subfields$.getValue() });
        } else {
          onSave(updatedField);
        }
      }
    }
  }, [onSave, submit, fieldToEdit, isEditingExistingField, subfields$]);

  const onClickCancel = useCallback(() => {
    const canClose = canCloseValidator();

    if (canClose) {
      onCancel();
    }
  }, [onCancel, canCloseValidator]);

  const renderModal = () => {
    if (modalVisibility.confirmChangeNameOrType) {
      return (
        <SaveFieldTypeOrNameChangedModal
          fieldName={fieldToEdit?.name!}
          onConfirm={async () => {
            const { data: updatedField } = await submit();
            if (updatedField.type === 'composite') {
              onSave({ ...updatedField, fields: subfields$.getValue() });
            } else {
              onSave(updatedField);
            }
          }}
          onCancel={() => {
            setModalVisibility(defaultModalVisibility);
          }}
        />
      );
    }

    if (modalVisibility.confirmUnsavedChanges) {
      return (
        <ModifiedFieldModal
          onConfirm={() => {
            setModalVisibility(defaultModalVisibility);
            onCancel();
          }}
          onCancel={() => {
            setModalVisibility(defaultModalVisibility);
          }}
        />
      );
    }

    return null;
  };

  useEffect(() => {
    if (onMounted) {
      // When the flyout mounts we send to the parent the validator to check
      // if we can close the flyout or not (and display a confirm modal if needed).
      // This is required to display the confirm modal when clicking outside the flyout.
      onMounted({ canCloseValidator });

      return () => {
        onMounted({ canCloseValidator: () => true });
      };
    }
  }, [onMounted, canCloseValidator]);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    getMatchingIndexTemplates(dataView.title);
  }, [dataView.title]);

  return (
    <>
      <FlyoutPanels.Group
        flyoutClassName={euiFlyoutClassname}
        maxWidth={1180}
        data-test-subj="fieldEditor"
        fixedPanelWidths
      >
        {/* Editor panel */}
        <FlyoutPanels.Item width={600}>
          <FlyoutPanels.Content>
            <FlyoutPanels.Header>
              <EuiTitle data-test-subj="flyoutTitle">
                <h2>
                  {fieldToEdit ? (
                    <FormattedMessage
                      id="indexPatternFieldEditor.editor.flyoutEditFieldTitle"
                      defaultMessage="Edit field '{fieldName}'"
                      values={{
                        fieldName: fieldToEdit.name,
                      }}
                    />
                  ) : (
                    <FormattedMessage
                      id="indexPatternFieldEditor.editor.flyoutDefaultTitle"
                      defaultMessage="Create field"
                    />
                  )}
                </h2>
              </EuiTitle>
              <EuiText color="subdued">
                <p>
                  <FormattedMessage
                    id="indexPatternFieldEditor.editor.flyoutEditFieldSubtitle"
                    defaultMessage="Data view: {patternName}"
                    values={{
                      patternName: <i>{dataView.getName()}</i>,
                    }}
                  />
                </p>
              </EuiText>
            </FlyoutPanels.Header>

            { !isPromoteVisible && <FieldEditor
              field={fieldToEdit ?? fieldToCreate}
              onChange={setFormState}
              onFormModifiedChange={setIsFormModified}
            /> }

            {isPromoteVisible &&
                <EuiFlexGroup>
                  <EuiFlexItem grow={false}>
                    <div>
                      {/* Title */}
                      <EuiTitle size="xs">
                        <h3>Promote runtime field</h3>
                      </EuiTitle>
                      <EuiSpacer size="xs" />

                      {/* Description */}
                      <EuiText size="s" color="subdued">
                        Promote runtime field to the index template
                      </EuiText>

                      {/* Content */}
                      <>
                        <EuiSpacer size="l" />
                        <EuiFormRow
                          label="Select target index template"
                          fullWidth
                        >
                          <EuiSelect
                            fullWidth
                            options={matchingTemplates}
                            value={selectedTemplate}
                            onChange={(e) => {
                              setSelectedTemplate(e.target.value);
                            }}
                            hasNoInitialSelection={true}
                          />
                        </EuiFormRow>

                        <EuiFormRow
                          label="Select target index template"
                          fullWidth
                        >
                          <EuiCheckbox id="ingestCheckbox" checked={ingest} onChange={(e) => {
                            setIngest(e.target.checked);
                          }} />
                        </EuiFormRow>
                      </>
                    </div>
                  </EuiFlexItem>
                </EuiFlexGroup>
            }
          </FlyoutPanels.Content>

          <FlyoutPanels.Footer>
            <>
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    iconType="cross"
                    flush="left"
                    onClick={onClickCancel}
                    data-test-subj="closeFlyoutButton"
                  >
                    {i18nTexts.cancelButtonLabel}
                  </EuiButtonEmpty>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        color="primary"
                        onClick={onClickPromote}
                        data-test-subj=""
                        disabled={hasErrors}
                        isLoading={isSavingField || isSubmitting}
                      >
                        Promote
                      </EuiButton>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      {!isPromoteVisible && <EuiButton
                        color="primary"
                        onClick={onClickSave}
                        data-test-subj="fieldSaveButton"
                        fill
                        disabled={hasErrors}
                        isLoading={isSavingField || isSubmitting}
                      >
                        {i18nTexts.saveButtonLabel}
                      </EuiButton> }
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          </FlyoutPanels.Footer>
        </FlyoutPanels.Item>

        {/* Preview panel */}
        {isPanelVisible && (
          <FlyoutPanels.Item
            width={440}
            backgroundColor="euiPageBackground"
            border="left"
            data-test-subj="previewPanel"
          >
            <FieldPreview />
          </FlyoutPanels.Item>
        )}
      </FlyoutPanels.Group>

      {renderModal()}
    </>
  );
};

export const FieldEditorFlyoutContent = React.memo(FieldEditorFlyoutContentComponent);
