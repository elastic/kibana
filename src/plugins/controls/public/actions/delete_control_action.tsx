/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { PresentationContainer, apiIsPresentationContainer } from '@kbn/presentation-containers';
import {
  EmbeddableApiContext,
  HasParentApi,
  HasType,
  HasUniqueId,
  PublishesViewMode,
  apiCanAccessViewMode,
  apiHasParentApi,
  apiHasType,
  apiHasUniqueId,
  apiIsOfType,
  getInheritedViewMode,
} from '@kbn/presentation-publishing';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { ACTION_DELETE_CONTROL } from '.';
import { CONTROL_GROUP_TYPE } from '..';
import { pluginServices } from '../services';

export type DeleteControlActionApi = HasType &
  HasUniqueId &
  HasParentApi<PresentationContainer & PublishesViewMode & HasType>;

const isApiCompatible = (api: unknown | null): api is DeleteControlActionApi =>
  Boolean(
    apiHasType(api) &&
      apiHasUniqueId(api) &&
      apiHasParentApi(api) &&
      apiCanAccessViewMode(api.parentApi) &&
      apiIsOfType(api.parentApi, CONTROL_GROUP_TYPE) &&
      apiIsPresentationContainer(api.parentApi)
  );

export class DeleteControlAction implements Action<EmbeddableApiContext> {
  public readonly type = ACTION_DELETE_CONTROL;
  public readonly id = ACTION_DELETE_CONTROL;
  public order = 100; // should always be last

  private openConfirm;

  constructor() {
    ({
      overlays: { openConfirm: this.openConfirm },
    } = pluginServices.getServices());
  }

  public readonly MenuItem = ({ context }: { context: EmbeddableApiContext }) => {
    if (!isApiCompatible(context.embeddable)) throw new IncompatibleActionError();

    return (
      <EuiToolTip content={this.getDisplayName(context)}>
        <EuiButtonIcon
          data-test-subj={`control-action-${context.embeddable.uuid}-delete`}
          aria-label={this.getDisplayName(context)}
          iconType={this.getIconType(context)}
          onClick={() => this.execute(context)}
          color="danger"
        />
      </EuiToolTip>
    );
  };

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return i18n.translate('controls.controlGroup.floatingActions.removeTitle', {
      defaultMessage: 'Delete',
    });
  }

  public getIconType({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return 'trash';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    return (
      isApiCompatible(embeddable) && getInheritedViewMode(embeddable.parentApi) === ViewMode.EDIT
    );
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();

    this.openConfirm(
      i18n.translate('controls.controlGroup.management.delete.sub', {
        defaultMessage: 'Controls are not recoverable once removed.',
      }),
      {
        confirmButtonText: i18n.translate('controls.controlGroup.management.delete.confirm', {
          defaultMessage: 'Delete',
        }),
        cancelButtonText: i18n.translate('controls.controlGroup.management.delete.cancel', {
          defaultMessage: 'Cancel',
        }),
        title: i18n.translate('controls.controlGroup.management.delete.deleteTitle', {
          defaultMessage: 'Delete control?',
        }),
        buttonColor: 'danger',
      }
    ).then((confirmed) => {
      if (confirmed) {
        embeddable.parentApi.removePanel(embeddable.uuid);
      }
    });
  }
}
