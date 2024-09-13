/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { SyntheticEvent } from 'react';

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { apiIsPresentationContainer, PresentationContainer } from '@kbn/presentation-containers';
import {
  apiCanAccessViewMode,
  apiHasParentApi,
  apiHasType,
  apiHasUniqueId,
  apiIsOfType,
  EmbeddableApiContext,
  HasParentApi,
  HasType,
  HasUniqueId,
} from '@kbn/presentation-publishing';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { ACTION_CLEAR_CONTROL } from '.';
import { CanClearSelections, isClearableControl } from '../../types';
import { ControlGroupStrings } from '../control_group_strings';
import { CONTROL_GROUP_TYPE } from '../types';

export type ClearControlActionApi = HasType &
  HasUniqueId &
  CanClearSelections &
  HasParentApi<PresentationContainer & HasType>;

const isApiCompatible = (api: unknown | null): api is ClearControlActionApi =>
  Boolean(
    apiHasType(api) &&
      apiHasUniqueId(api) &&
      isClearableControl(api) &&
      apiHasParentApi(api) &&
      apiCanAccessViewMode(api.parentApi) &&
      apiIsOfType(api.parentApi, CONTROL_GROUP_TYPE) &&
      apiIsPresentationContainer(api.parentApi)
  );

export class ClearControlAction implements Action<EmbeddableApiContext> {
  public readonly type = ACTION_CLEAR_CONTROL;
  public readonly id = ACTION_CLEAR_CONTROL;
  public order = 1;

  constructor() {}

  public readonly MenuItem = ({ context }: { context: EmbeddableApiContext }) => {
    if (!isApiCompatible(context.embeddable)) throw new IncompatibleActionError();

    return (
      <EuiToolTip content={this.getDisplayName(context)}>
        <EuiButtonIcon
          data-test-subj={`control-action-${context.embeddable.uuid}-erase`}
          aria-label={this.getDisplayName(context)}
          iconType={this.getIconType(context)}
          onClick={(event: SyntheticEvent<HTMLButtonElement>) => {
            (event.target as HTMLButtonElement).blur();
            this.execute(context);
          }}
          color="text"
        />
      </EuiToolTip>
    );
  };

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return ControlGroupStrings.floatingActions.getClearButtonTitle();
  }

  public getIconType({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return 'eraser';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    return isApiCompatible(embeddable);
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    embeddable.clearSelections();
  }
}
