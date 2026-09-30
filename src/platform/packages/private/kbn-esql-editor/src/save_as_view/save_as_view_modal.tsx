/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FormEvent, FunctionComponent, ReactNode } from 'react';
import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIconTip,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiTextArea,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { KbnDangerCallout } from '@kbn/ui-callout';
import {
  createEsqlViewsManagementClient,
  ESQL_VIEW_ALREADY_EXISTS_ERROR_TYPE,
  EsqlViewsClientError,
  MAX_ESQL_VIEW_DESCRIPTION_LENGTH,
  validateEsqlViewName,
  type EsqlViewNameValidationError,
} from '@kbn/esql-utils';
import type { ESQLEditorDeps } from '../types';

export const saveAsViewLabel = i18n.translate('esqlEditor.saveAsView.openModalTooltip', {
  defaultMessage: 'Save as view',
});

const modalTitle = i18n.translate('esqlEditor.saveAsView.modalTitle', {
  defaultMessage: 'Save as view',
});

const nameLabel = i18n.translate('esqlEditor.saveAsView.nameLabel', {
  defaultMessage: 'Name',
});

const namePlaceholder = i18n.translate('esqlEditor.saveAsView.namePlaceholder', {
  defaultMessage: 'e.g. my-view',
});

const nameDescription = i18n.translate('esqlEditor.saveAsView.nameDescription', {
  defaultMessage:
    'Must not match an existing index, data stream, alias, external dataset, or view.',
});

const descriptionLabel = i18n.translate('esqlEditor.saveAsView.descriptionLabel', {
  defaultMessage: 'Description (optional)',
});

const descriptionPlaceholder = i18n.translate('esqlEditor.saveAsView.descriptionPlaceholder', {
  defaultMessage: 'Describe this view',
});

const descriptionDescription = i18n.translate('esqlEditor.saveAsView.descriptionDescription', {
  defaultMessage: 'Add a brief description to help identify this view.',
});

const queryLabel = i18n.translate('esqlEditor.saveAsView.queryLabel', {
  defaultMessage: 'Query',
});

const cancelButtonLabel = i18n.translate('esqlEditor.saveAsView.cancelButtonLabel', {
  defaultMessage: 'Cancel',
});

const saveButtonLabel = i18n.translate('esqlEditor.saveAsView.saveButtonLabel', {
  defaultMessage: 'Save',
});

const nameRequiredErrorMessage = i18n.translate('esqlEditor.saveAsView.nameRequiredErrorMessage', {
  defaultMessage: 'Enter a name.',
});

const nameInvalidFormatErrorMessage = i18n.translate(
  'esqlEditor.saveAsView.nameInvalidFormatErrorMessage',
  {
    defaultMessage:
      'Use lowercase characters. Names can\'t start with -, _, or +, be . or .., or contain spaces, commas, \\, /, *, ?, ", <, >, |, #, or :.',
  }
);

const nameTooLongErrorMessage = i18n.translate('esqlEditor.saveAsView.nameTooLongErrorMessage', {
  defaultMessage: 'Name cannot be longer than 255 bytes.',
});

const descriptionTooLongErrorMessage = i18n.translate(
  'esqlEditor.saveAsView.descriptionTooLongErrorMessage',
  {
    defaultMessage: 'Description cannot be longer than 1,000 characters.',
  }
);

const viewAlreadyExistsErrorMessage = i18n.translate(
  'esqlEditor.saveAsView.viewAlreadyExistsErrorMessage',
  {
    defaultMessage: 'A view with this name already exists.',
  }
);

const nameConflictErrorMessage = i18n.translate('esqlEditor.saveAsView.nameConflictErrorMessage', {
  defaultMessage: 'This name is already used by another Elasticsearch resource.',
});

const errorDetailsAriaLabel = i18n.translate('esqlEditor.saveAsView.errorDetailsAriaLabel', {
  defaultMessage: 'Show Elasticsearch error details',
});

const saveErrorTitle = i18n.translate('esqlEditor.saveAsView.saveErrorTitle', {
  defaultMessage: 'Unable to save ES|QL view',
});

const saveSuccessTitle = (name: string) =>
  i18n.translate('esqlEditor.saveAsView.saveSuccessTitle', {
    defaultMessage: 'View "{name}" was saved.',
    values: { name },
  });

const getNameValidationMessage = (
  validationError: EsqlViewNameValidationError | undefined
): string | undefined => {
  switch (validationError) {
    case 'required':
      return nameRequiredErrorMessage;
    case 'invalidFormat':
      return nameInvalidFormatErrorMessage;
    case 'tooLong':
      return nameTooLongErrorMessage;
    default:
      return undefined;
  }
};

type NameConflict = { type: 'existingView' } | { type: 'otherResource'; details: string };

export interface SaveAsViewModalProps {
  query: string;
  onClose: () => void;
  onSaved?: (viewName: string) => void | Promise<void>;
}

export const SaveAsViewModal: FunctionComponent<SaveAsViewModalProps> = ({
  query,
  onClose,
  onSaved,
}) => {
  const modalTitleId = useGeneratedHtmlId();
  const formId = useGeneratedHtmlId();
  const {
    services: { core },
  } = useKibana<ESQLEditorDeps>();
  const client = useMemo(() => createEsqlViewsManagementClient(core.http), [core.http]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isNameTouched, setIsNameTouched] = useState(false);
  const [nameConflict, setNameConflict] = useState<NameConflict>();
  const [saveError, setSaveError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };

  const nameValidationError = isNameTouched
    ? getNameValidationMessage(validateEsqlViewName(name))
    : undefined;
  const descriptionError =
    description.length > MAX_ESQL_VIEW_DESCRIPTION_LENGTH
      ? descriptionTooLongErrorMessage
      : undefined;

  const nameError: ReactNode =
    nameConflict?.type === 'existingView' ? (
      viewAlreadyExistsErrorMessage
    ) : nameConflict?.type === 'otherResource' ? (
      <span>
        {nameConflictErrorMessage}{' '}
        <span data-test-subj="saveAsViewNameConflictDetails">
          <EuiIconTip
            aria-label={errorDetailsAriaLabel}
            content={nameConflict.details}
            type="question"
          />
        </span>
      </span>
    ) : (
      nameValidationError
    );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsNameTouched(true);
    setNameConflict(undefined);
    setSaveError(undefined);

    if (validateEsqlViewName(name) || description.length > MAX_ESQL_VIEW_DESCRIPTION_LENGTH) {
      return;
    }

    setIsSaving(true);
    try {
      await client.createView({
        name,
        query,
        description: description.trim().length > 0 ? description : undefined,
      });
      core.notifications.toasts.addSuccess({ title: saveSuccessTitle(name) });
      await onSaved?.(name);
      onClose();
    } catch (error) {
      if (error instanceof EsqlViewsClientError) {
        if (error.errorType === ESQL_VIEW_ALREADY_EXISTS_ERROR_TYPE) {
          setNameConflict({ type: 'existingView' });
        } else if (error.errorType === 'resource_already_exists_exception') {
          setNameConflict({ type: 'otherResource', details: error.message });
        } else {
          setSaveError(error.message);
        }
      } else {
        setSaveError(error instanceof Error ? error.message : String(error));
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <EuiModal aria-labelledby={modalTitleId} data-test-subj="saveAsViewModal" onClose={handleClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>{modalTitle}</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        {saveError && (
          <>
            <KbnDangerCallout
              announceOnMount
              data-test-subj="saveAsViewSaveError"
              size="s"
              text={<p>{saveError}</p>}
              title={saveErrorTitle}
            />
            <EuiSpacer size="l" />
          </>
        )}
        <EuiForm component="form" id={formId} onSubmit={handleSubmit}>
          <EuiFormRow
            error={nameError}
            fullWidth
            helpText={nameDescription}
            isInvalid={Boolean(nameError)}
            label={nameLabel}
          >
            <EuiFieldText
              data-test-subj="saveAsViewNameInput"
              disabled={isSaving}
              fullWidth
              isInvalid={Boolean(nameError)}
              onChange={({ target }) => {
                setName(target.value);
                setIsNameTouched(true);
                setNameConflict(undefined);
                setSaveError(undefined);
              }}
              placeholder={namePlaceholder}
              value={name}
            />
          </EuiFormRow>

          <EuiFormRow
            error={descriptionError}
            fullWidth
            helpText={descriptionDescription}
            isInvalid={Boolean(descriptionError)}
            label={descriptionLabel}
          >
            <EuiTextArea
              data-test-subj="saveAsViewDescriptionInput"
              disabled={isSaving}
              fullWidth
              isInvalid={Boolean(descriptionError)}
              onChange={({ target }) => {
                setDescription(target.value);
                setSaveError(undefined);
              }}
              placeholder={descriptionPlaceholder}
              rows={2}
              value={description}
            />
          </EuiFormRow>

          <EuiFormRow fullWidth label={queryLabel}>
            <EuiCodeBlock
              data-test-subj="saveAsViewQueryPreview"
              fontSize="s"
              isCopyable={false}
              language="esql"
              overflowHeight={120}
              paddingSize="s"
            >
              {query}
            </EuiCodeBlock>
          </EuiFormRow>
        </EuiForm>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup gutterSize="m" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="saveAsViewCancelButton"
              isDisabled={isSaving}
              onClick={handleClose}
            >
              {cancelButtonLabel}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="saveAsViewSubmitButton"
              fill
              form={formId}
              isLoading={isSaving}
              type="submit"
            >
              {saveButtonLabel}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
