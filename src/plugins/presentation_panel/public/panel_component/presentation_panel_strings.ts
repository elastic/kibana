/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const placeholderTitle = i18n.translate('presentationPanel.placeholderTitle', {
  defaultMessage: '[No Title]',
});

export const getAriaLabelForTitle = (title?: string) => {
  if (title) {
    return i18n.translate('presentationPanel.enhancedAriaLabel', {
      defaultMessage: 'Panel: {title}',
      values: { title: title || placeholderTitle },
    });
  }
  return i18n.translate('presentationPanel.ariaLabel', {
    defaultMessage: 'Panel',
  });
};

export const getErrorCallToAction = (title: string) =>
  i18n.translate('presentationPanel.error.editButton', {
    defaultMessage: 'Edit {value}',
    values: { value: title },
  });

export const getErrorLoadingPanel = () =>
  i18n.translate('presentationPanel.error.errorWhenLoadingPanel', {
    defaultMessage: 'An error occurred while loading this panel.',
  });

export const getEditTitleAriaLabel = (title?: string) =>
  i18n.translate('presentationPanel.header.titleAriaLabel', {
    defaultMessage: 'Click to edit title: {title}',
    values: { title: title || placeholderTitle },
  });

export const getContextMenuAriaLabel = (title?: string, index?: number) => {
  if (title) {
    return i18n.translate('presentationPanel.contextMenu.ariaLabelWithTitle', {
      defaultMessage: 'Panel options for {title}',
      values: { title },
    });
  }
  if (index) {
    return i18n.translate('presentationPanel.contextMenu.ariaLabelWithIndex', {
      defaultMessage: 'Options for panel {index}',
      values: { index },
    });
  }
  return i18n.translate('presentationPanel.contextMenu.ariaLabel', {
    defaultMessage: 'Panel options',
  });
};
