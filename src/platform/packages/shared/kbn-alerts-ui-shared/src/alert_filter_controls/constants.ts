/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ALERT_RULE_NAME, ALERT_STATUS } from '@kbn/rule-data-utils';
import type { OptionsListControlState, PinnedControlState } from '@kbn/controls-schemas';
import { i18n } from '@kbn/i18n';
import type { FilterControlConfig } from './types';

export const DEFAULT_CONTROLS: FilterControlConfig[] = [
  {
    title: i18n.translate('alertsUIShared.alertFilterControls.defaultControlDisplayNames.status', {
      defaultMessage: 'Status',
    }),
    field_name: ALERT_STATUS,
    selected_options: ['active'],
    display_settings: { hide_action_bar: true, hide_exists: true },
    persist: true,
  },
  {
    title: i18n.translate('alertsUIShared.alertFilterControls.defaultControlDisplayNames.rule', {
      defaultMessage: 'Rule',
    }),
    field_name: ALERT_RULE_NAME,
    display_settings: { hide_exists: true },
  },
  {
    title: i18n.translate('alertsUIShared.alertFilterControls.defaultControlDisplayNames.group', {
      defaultMessage: 'Group',
    }),
    field_name: 'kibana.alert.group.value',
  },
  {
    title: i18n.translate('alertsUIShared.alertFilterControls.defaultControlDisplayNames.tags', {
      defaultMessage: 'Tags',
    }),
    field_name: 'tags',
  },
];

export const URL_PARAM_KEY = 'pageFilters';

export const TEST_IDS = {
  FILTER_CONTROLS: 'filter-group__items',
  FILTER_LOADING: 'filter-group__loading',
  MOCKED_CONTROL: 'mocked_control_group',
  ADD_CONTROL: 'filter-group__add-control',
  SAVE_CONTROL: 'filter-group__save',
  SAVE_CHANGE_POPOVER: 'filter-group__save-popover',
  FILTERS_CHANGED_BANNER: 'filter-group--changed-banner',
  FILTERS_CHANGED_BANNER_SAVE: 'filter-group__save',
  FILTERS_CHANGED_BANNER_DISCARD: 'filter-group__discard',
  CONTEXT_MENU: {
    BTN: 'filter-group__context',
    MENU: 'filter-group__context-menu',
    RESET: 'filter-group__context--reset',
    EDIT: 'filter-group__context--edit',
    DISCARD: `filter-group__context--discard`,
  },
};

export const COMMON_OPTIONS_LIST_CONTROL_INPUTS: Partial<PinnedControlState> &
  Partial<OptionsListControlState> = {
  display_settings: { hide_exclude: true, hide_sort: true, placeholder: '' },
  width: 'small',
  grow: true,
};

export const TIMEOUTS = {
  /* because of recent changes in controls-plugin debounce time may not be needed
   * still keeping the config for some time for any recent changes
   * */
  FILTER_UPDATES_DEBOUNCE_TIME: 0,
};
