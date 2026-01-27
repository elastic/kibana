/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { Trigger } from '@kbn/ui-actions-plugin/public';
import type { Action } from '@kbn/ui-actions-plugin/public/actions';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { CONTROL_MENU_TRIGGER } from '@kbn/controls-constants';
import type { DataControlState } from '@kbn/controls-schemas';
import type { CustomOptionsComponentProps } from '../controls/data_controls/types';

export type CreateControlTypeContext<State extends DataControlState> = EmbeddableApiContext & {
  state: Partial<State>;
  controlId?: string;
  isPinned?: boolean;
};

export type CreateControlTypeAction<State extends DataControlState = DataControlState> = Action<
  CreateControlTypeContext<State>,
  {
    CustomOptionsComponent?: React.FC<CustomOptionsComponentProps<State>>;
    isFieldCompatible: (field: DataViewField) => boolean;
  }
> & {
  getDisplayName: () => string; // remove context from `getDisplayName`
};

export const addControlMenuTrigger: Trigger = {
  id: CONTROL_MENU_TRIGGER,
  title: i18n.translate('controls.uiActions.triggers.controls.typeMenu.title', {
    defaultMessage: 'Control type in control menu',
  }),
  description: i18n.translate('controls.uiActions.triggers.controls.typeMenu.description', {
    defaultMessage: 'A new action will appear in the control type menu',
  }),
};
