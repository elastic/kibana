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
      i18n.translate('navEmbeddable.editor.addButtonLabel', {
        defaultMessage: 'Add link',
      }),
    getCancelButtonLabel: () =>
      i18n.translate('navEmbeddable.editor.cancelButtonLabel', {
        defaultMessage: 'Close',
      }),
    panelEditor: {
      getEmptyLinksMessage: () =>
        i18n.translate('navEmbeddable.panelEditor.emptyLinksMessage', {
          defaultMessage: "You haven't added any links yet.",
        }),
      getCreateFlyoutTitle: () =>
        i18n.translate('navEmbeddable.panelEditor.createFlyoutTitle', {
          defaultMessage: 'Create links panel',
        }),
      getSaveButtonLabel: () =>
        i18n.translate('navEmbeddable.panelEditor.saveButtonLabel', {
          defaultMessage: 'Save',
        }),
    },
    linkEditor: {
      getLinkTypePickerLabel: () =>
        i18n.translate('navEmbeddable.linkEditor.linkTypeFormLabel', {
          defaultMessage: 'Go to',
        }),
      getLinkDestinationLabel: () =>
        i18n.translate('navEmbeddable.linkEditor.linkDestinationLabel', {
          defaultMessage: 'Choose destination',
        }),
      getLinkTextLabel: () =>
        i18n.translate('navEmbeddable.linkEditor.linkTextLabel', {
          defaultMessage: 'Text',
        }),
      getLinkTextPlaceholder: () =>
        i18n.translate('navEmbeddable.linkEditor.linkTextPlaceholder', {
          defaultMessage: 'Enter text for link',
        }),
    },
  },
};
