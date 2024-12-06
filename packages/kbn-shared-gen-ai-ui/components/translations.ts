/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const getRequiredMessage = (field: string) => {
  return i18n.translate('xpack.sharedGenAIUI.components.requiredGenericTextField', {
    defaultMessage: '{field} is required.',
    values: { field },
  });
};

export const INPUT_INVALID = i18n.translate(
  'xpack.stackConnectors.inference.params.error.invalidInputText',
  {
    defaultMessage: 'Input does not have a valid Array format.',
  }
);

export const INVALID_ACTION = i18n.translate('xpack.sharedGenAIUI.components.invalidActionText', {
  defaultMessage: 'Invalid action name.',
});

export const BODY = i18n.translate('xpack.sharedGenAIUI.components.bodyFieldLabel', {
  defaultMessage: 'Body',
});

export const INPUT = i18n.translate('xpack.sharedGenAIUI.components.completionInputLabel', {
  defaultMessage: 'Input',
});

export const INPUT_TYPE = i18n.translate(
  'xpack.sharedGenAIUI.components.completionInputTypeLabel',
  {
    defaultMessage: 'Input type',
  }
);

export const QUERY = i18n.translate('xpack.sharedGenAIUI.components.rerankQueryLabel', {
  defaultMessage: 'Query',
});

export const BODY_DESCRIPTION = i18n.translate(
  'xpack.sharedGenAIUI.components.bodyCodeEditorAriaLabel',
  {
    defaultMessage: 'Code editor',
  }
);

export const TASK_TYPE = i18n.translate('xpack.sharedGenAIUI.components.taskTypeFieldLabel', {
  defaultMessage: 'Task type',
});

export const PROVIDER = i18n.translate('xpack.sharedGenAIUI.components.providerFieldLabel', {
  defaultMessage: 'Provider',
});

export const PROVIDER_REQUIRED = i18n.translate(
  'xpack.sharedGenAIUI.components.error.requiredProviderText',
  {
    defaultMessage: 'Provider is required.',
  }
);

export const DOCUMENTATION = i18n.translate('xpack.sharedGenAIUI.components.documentation', {
  defaultMessage: 'Inference API documentation',
});

export const SELECT_PROVIDER = i18n.translate('xpack.sharedGenAIUI.components.selectProvider', {
  defaultMessage: 'Select a service',
});

export const COPY_TOOLTIP = i18n.translate('xpack.sharedGenAIUI.components.copy.tooltip', {
  defaultMessage: 'Copy to clipboard',
});

export const COPIED_TOOLTIP = i18n.translate('xpack.sharedGenAIUI.components.copied.tooltip', {
  defaultMessage: 'Copied!',
});
