/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const NavEmbeddableStrings = {
  editor: {
    getAddButtonLabel: () =>
      i18n.translate('navigationEmbeddable.editor.addButtonLabel', {
        defaultMessage: 'Add link',
      }),
    getUpdateButtonLabel: () =>
      i18n.translate('navigationEmbeddable.editor.updateButtonLabel', {
        defaultMessage: 'Update link',
      }),
    getEditLinkTitle: () =>
      i18n.translate('navigationEmbeddable.editor.editLinkTitle', {
        defaultMessage: 'Edit link',
      }),
    getDeleteLinkTitle: () =>
      i18n.translate('navigationEmbeddable.editor.deleteLinkTitle', {
        defaultMessage: 'Delete link',
      }),
    getCancelButtonLabel: () =>
      i18n.translate('navigationEmbeddable.editor.cancelButtonLabel', {
        defaultMessage: 'Close',
      }),
    panelEditor: {
      getLinksTitle: () =>
        i18n.translate('navigationEmbeddable.panelEditor.linksTitle', {
          defaultMessage: 'Links',
        }),
      getEmptyLinksMessage: () =>
        i18n.translate('navigationEmbeddable.panelEditor.emptyLinksMessage', {
          defaultMessage: 'Use links to navigate to commonly used dashboards and websites.',
        }),
      getEmptyLinksTooltip: () =>
        i18n.translate('navigationEmbeddable.panelEditor.emptyLinksTooltip', {
          defaultMessage: 'Add one or more links.',
        }),
      getCreateFlyoutTitle: () =>
        i18n.translate('navigationEmbeddable.panelEditor.createFlyoutTitle', {
          defaultMessage: 'Create links panel',
        }),
      getEditFlyoutTitle: () =>
        i18n.translate('navigationEmbeddable.panelEditor.editFlyoutTitle', {
          defaultMessage: 'Edit links panel',
        }),
      getSaveButtonLabel: () =>
        i18n.translate('navigationEmbeddable.panelEditor.saveButtonLabel', {
          defaultMessage: 'Save',
        }),
      getSaveToLibrarySwitchLabel: () =>
        i18n.translate('navigationEmbeddable.panelEditor.saveToLibrarySwitchLabel', {
          defaultMessage: 'Save to library',
        }),
      getSaveToLibrarySwitchTooltip: () =>
        i18n.translate('navigationEmbeddable.panelEditor.saveToLibrarySwitchTooltip', {
          defaultMessage:
            'Save this links panel to the library so you can easily add it to other dashboards.',
        }),
      getTitleInputLabel: () =>
        i18n.translate('navigationEmbeddable.panelEditor.titleInputLabel', {
          defaultMessage: 'Title',
        }),
      getBrokenDashboardLinkAriaLabel: () =>
        i18n.translate('navigationEmbeddable.panelEditor.brokenDashboardLinkAriaLabel', {
          defaultMessage: 'Broken dashboard link',
        }),
      getDragHandleAriaLabel: () =>
        i18n.translate('navigationEmbeddable.panelEditor.dragHandleAriaLabel', {
          defaultMessage: 'Link drag handle',
        }),
      getLayoutSettingsTitle: () =>
        i18n.translate('navigationEmbeddable.panelEditor.layoutSettingsTitle', {
          defaultMessage: 'Layout',
        }),
      getLayoutSettingsLegend: () =>
        i18n.translate('navigationEmbeddable.panelEditor.layoutSettingsLegend', {
          defaultMessage: 'Choose how to display your links.',
        }),
      getHorizontalLayoutLabel: () =>
        i18n.translate('navigationEmbeddable.editor.horizontalLayout', {
          defaultMessage: 'Horizontal',
        }),
      getVerticalLayoutLabel: () =>
        i18n.translate('navigationEmbeddable.editor.verticalLayout', {
          defaultMessage: 'Vertical',
        }),
      getErrorDuringSaveToastTitle: () =>
        i18n.translate('navigationEmbeddable.editor.unableToSaveToastTitle', {
          defaultMessage: 'Error saving Link panel',
        }),
    },
    linkEditor: {
      getGoBackAriaLabel: () =>
        i18n.translate('navigationEmbeddable.linkEditor.goBackAriaLabel', {
          defaultMessage: 'Go back to panel editor.',
        }),
      getLinkTypePickerLabel: () =>
        i18n.translate('navigationEmbeddable.linkEditor.linkTypeFormLabel', {
          defaultMessage: 'Go to',
        }),
      getLinkDestinationLabel: () =>
        i18n.translate('navigationEmbeddable.linkEditor.linkDestinationLabel', {
          defaultMessage: 'Choose destination',
        }),
      getLinkTextLabel: () =>
        i18n.translate('navigationEmbeddable.linkEditor.linkTextLabel', {
          defaultMessage: 'Text',
        }),
      getLinkTextPlaceholder: () =>
        i18n.translate('navigationEmbeddable.linkEditor.linkTextPlaceholder', {
          defaultMessage: 'Enter text for link',
        }),
      getLinkOptionsLabel: () =>
        i18n.translate('navigationEmbeddable.linkEditor.linkOptionsLabel', {
          defaultMessage: 'Options',
        }),
    },
  },
};
