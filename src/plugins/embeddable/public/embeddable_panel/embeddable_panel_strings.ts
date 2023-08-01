/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const placeholderTitle = i18n.translate('embeddableApi.panel.placeholderTitle', {
  defaultMessage: '[No Title]',
});

export const getAriaLabelForTitle = (title?: string) => {
  if (title) {
    return i18n.translate('embeddableApi.panel.enhancedDashboardPanelAriaLabel', {
      defaultMessage: 'Dashboard panel: {title}',
      values: { title: title || placeholderTitle },
    });
  }
  return i18n.translate('embeddableApi.panel.dashboardPanelAriaLabel', {
    defaultMessage: 'Dashboard panel',
  });
};

export const getEditTitleAriaLabel = (title?: string) =>
  i18n.translate('embeddableApi.panel.editTitleAriaLabel', {
    defaultMessage: 'Click to edit title: {title}',
    values: { title: title || placeholderTitle },
  });

export const getContextMenuAriaLabel = (title?: string, index?: number) => {
  if (title) {
    return i18n.translate('embeddableApi.panel.optionsMenu.panelOptionsButtonEnhancedAriaLabel', {
      defaultMessage: 'Panel options for {title}',
      values: { title },
    });
  }
  if (index) {
    return i18n.translate('embeddableApi.panel.optionsMenu.panelOptionsButtonAriaLabelWithIndex', {
      defaultMessage: 'Options for panel {index}',
      values: { index },
    });
  }
  return i18n.translate('embeddableApi.panel.optionsMenu.panelOptionsButtonAriaLabel', {
    defaultMessage: 'Panel options',
  });
};
