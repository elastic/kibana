/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Trigger } from '@kbn/ui-actions-plugin/public';

export const CONTEXT_MENU_TRIGGER = 'CONTEXT_MENU_TRIGGER';
export const contextMenuTrigger: Trigger = {
  id: CONTEXT_MENU_TRIGGER,
  title: i18n.translate('presentation.contextMenuTrigger.title', {
    defaultMessage: 'Context menu',
  }),
  description: i18n.translate('presentation.contextMenuTrigger.description', {
    defaultMessage: "A new action will be added to the panel's context menu",
  }),
};

export const PANEL_HOVER_TRIGGER = 'PANEL_HOVER_TRIGGER';
export const panelHoverTrigger: Trigger = {
  id: PANEL_HOVER_TRIGGER,
  title: i18n.translate('presentation.panelHoverTrigger.title', {
    defaultMessage: 'Panel hover',
  }),
  description: i18n.translate('presentation.panelHoverTrigger.description', {
    defaultMessage: "A new action will be added to the panel's hover menu",
  }),
};

export const PANEL_BADGE_TRIGGER = 'PANEL_BADGE_TRIGGER';
export const panelBadgeTrigger: Trigger = {
  id: PANEL_BADGE_TRIGGER,
  title: i18n.translate('presentation.panelBadgeTrigger.title', {
    defaultMessage: 'Panel badges',
  }),
  description: i18n.translate('presentation.panelBadgeTrigger.description', {
    defaultMessage: 'Badge actions appear in title bar when an embeddable loads in a panel.',
  }),
};

export const PANEL_NOTIFICATION_TRIGGER = 'PANEL_NOTIFICATION_TRIGGER';
export const panelNotificationTrigger: Trigger = {
  id: PANEL_NOTIFICATION_TRIGGER,
  title: i18n.translate('presentation.panelNotificationTrigger.title', {
    defaultMessage: 'Panel notifications',
  }),
  description: i18n.translate('presentation.panelNotificationTrigger.description', {
    defaultMessage: 'Notification actions appear in top-right corner of a panel.',
  }),
};
