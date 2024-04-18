/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const LinksStrings = {
  getDescription: () =>
    i18n.translate('links.description', {
      defaultMessage: 'Use links to navigate to commonly used dashboards and websites.',
    }),
  editor: {
    getAddButtonLabel: () =>
      i18n.translate('links.editor.addButtonLabel', {
        defaultMessage: 'Add link',
      }),
    getUpdateButtonLabel: () =>
      i18n.translate('links.editor.updateButtonLabel', {
        defaultMessage: 'Update link',
      }),
    getEditLinkTitle: (label?: string) =>
      i18n.translate('links.editor.editLinkTitle.hasLabel', {
        defaultMessage: 'Edit {label} link',
        values: { label: label ?? '' },
      }),
    getDeleteLinkTitle: (label?: string) =>
      i18n.translate('links.editor.deleteLinkTitle', {
        defaultMessage: 'Delete {label} link',
        values: { label: label ?? '' },
      }),
    getCancelButtonLabel: () =>
      i18n.translate('links.editor.cancelButtonLabel', {
        defaultMessage: 'Close',
      }),
    panelEditor: {
      getLinksTitle: () =>
        i18n.translate('links.panelEditor.linksTitle', {
          defaultMessage: 'Links',
        }),
      getEmptyLinksMessage: () =>
        i18n.translate('links.panelEditor.emptyLinksMessage', {
          defaultMessage: "You haven't added any links yet.",
        }),
      getEmptyLinksTooltip: () =>
        i18n.translate('links.panelEditor.emptyLinksTooltip', {
          defaultMessage: 'Add one or more links.',
        }),
      getCreateFlyoutTitle: () =>
        i18n.translate('links.panelEditor.createFlyoutTitle', {
          defaultMessage: 'Create links panel',
        }),
      getEditFlyoutTitle: () =>
        i18n.translate('links.panelEditor.editFlyoutTitle', {
          defaultMessage: 'Edit links panel',
        }),
      getSaveButtonLabel: () =>
        i18n.translate('links.panelEditor.saveButtonLabel', {
          defaultMessage: 'Save',
        }),
      getSaveToLibrarySwitchLabel: () =>
        i18n.translate('links.panelEditor.saveToLibrarySwitchLabel', {
          defaultMessage: 'Save to library',
        }),
      getSaveToLibrarySwitchTooltip: () =>
        i18n.translate('links.panelEditor.saveToLibrarySwitchTooltip', {
          defaultMessage:
            'Save this links panel to the library so you can easily add it to other dashboards.',
        }),
      getTitleInputLabel: () =>
        i18n.translate('links.panelEditor.titleInputLabel', {
          defaultMessage: 'Title',
        }),
      getBrokenDashboardLinkAriaLabel: () =>
        i18n.translate('links.panelEditor.brokenDashboardLinkAriaLabel', {
          defaultMessage: 'Broken dashboard link',
        }),
      getDragHandleAriaLabel: () =>
        i18n.translate('links.panelEditor.dragHandleAriaLabel', {
          defaultMessage: 'Link drag handle',
        }),
      getLayoutSettingsTitle: () =>
        i18n.translate('links.panelEditor.layoutSettingsTitle', {
          defaultMessage: 'Layout',
        }),
      getLayoutSettingsLegend: () =>
        i18n.translate('links.panelEditor.layoutSettingsLegend', {
          defaultMessage: 'Choose how to display your links.',
        }),
      getHorizontalLayoutLabel: () =>
        i18n.translate('links.editor.horizontalLayout', {
          defaultMessage: 'Horizontal',
        }),
      getVerticalLayoutLabel: () =>
        i18n.translate('links.editor.verticalLayout', {
          defaultMessage: 'Vertical',
        }),
      getErrorDuringSaveToastTitle: () =>
        i18n.translate('links.editor.unableToSaveToastTitle', {
          defaultMessage: 'Error saving Link panel',
        }),
    },
    linkEditor: {
      getGoBackAriaLabel: () =>
        i18n.translate('links.linkEditor.goBackAriaLabel', {
          defaultMessage: 'Go back to panel editor.',
        }),
      getLinkTypePickerLabel: () =>
        i18n.translate('links.linkEditor.linkTypeFormLabel', {
          defaultMessage: 'Go to',
        }),
      getLinkDestinationLabel: () =>
        i18n.translate('links.linkEditor.linkDestinationLabel', {
          defaultMessage: 'Choose destination',
        }),
      getLinkTextLabel: () =>
        i18n.translate('links.linkEditor.linkTextLabel', {
          defaultMessage: 'Text',
        }),
      getLinkTextPlaceholder: () =>
        i18n.translate('links.linkEditor.linkTextPlaceholder', {
          defaultMessage: 'Enter text for link',
        }),
      getLinkOptionsLabel: () =>
        i18n.translate('links.linkEditor.linkOptionsLabel', {
          defaultMessage: 'Options',
        }),
    },
  },
};
