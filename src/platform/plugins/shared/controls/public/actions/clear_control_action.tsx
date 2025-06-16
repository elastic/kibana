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
import { i18n } from '@kbn/i18n';
import {
  apiCanAccessViewMode,
  apiHasParentApi,
  apiHasType,
  apiHasUniqueId,
  apiIsOfType,
  HasParentApi,
  type EmbeddableApiContext,
  type HasUniqueId,
  HasType,
} from '@kbn/presentation-publishing';
import {
  IncompatibleActionError,
  FrequentCompatibilityChangeAction,
  type Action,
} from '@kbn/ui-actions-plugin/public';
import { PresentationContainer, apiIsPresentationContainer } from '@kbn/presentation-containers';
import { map } from 'rxjs';
import { CONTROL_GROUP_TYPE } from '../../common';
import { CanClearSelections, isClearableControl } from '../types';

import { ACTION_CLEAR_CONTROL } from './constants';

type ClearControlActionApi = HasType &
  HasUniqueId &
  CanClearSelections &
  HasParentApi<PresentationContainer & HasType>;

const compatibilityCheck = (api: unknown | null): api is ClearControlActionApi =>
  Boolean(
    apiHasType(api) &&
      apiHasUniqueId(api) &&
      isClearableControl(api) &&
      apiHasParentApi(api) &&
      apiCanAccessViewMode(api.parentApi) &&
      apiIsOfType(api.parentApi, CONTROL_GROUP_TYPE) &&
      apiIsPresentationContainer(api.parentApi)
  );

export class ClearControlAction
  implements Action<EmbeddableApiContext>, FrequentCompatibilityChangeAction<EmbeddableApiContext>
{
  public readonly type = ACTION_CLEAR_CONTROL;
  public readonly id = ACTION_CLEAR_CONTROL;
  public order = 1;

  constructor() {}

  public readonly MenuItem = ({ context }: { context: EmbeddableApiContext }) => {
    return (
      <EuiToolTip content={this.getDisplayName(context)}>
        <EuiButtonIcon
          data-test-subj={`control-action-${(context.embeddable as HasUniqueId).uuid}-erase`}
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
    return i18n.translate('controls.controlGroup.floatingActions.clearTitle', {
      defaultMessage: 'Clear',
    });
  }

  public getIconType({ embeddable }: EmbeddableApiContext) {
    return 'eraser';
  }

  public couldBecomeCompatible({ embeddable }: EmbeddableApiContext) {
    return isClearableControl(embeddable);
  }

  public getCompatibilityChangesSubject({ embeddable }: EmbeddableApiContext) {
    return isClearableControl(embeddable)
      ? embeddable.hasSelections$.pipe(map(() => undefined))
      : undefined;
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    return compatibilityCheck(embeddable);
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!compatibilityCheck(embeddable)) throw new IncompatibleActionError();

    embeddable.clearSelections();
  }
}
