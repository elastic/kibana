/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { apiIsPresentationContainer, PresentationContainer } from '@kbn/presentation-containers';
import {
  apiCanAccessViewMode,
  apiHasParentApi,
  apiHasType,
  apiHasUniqueId,
  apiIsOfType,
  EmbeddableApiContext,
  getInheritedViewMode,
  hasEditCapabilities,
  HasEditCapabilities,
  HasParentApi,
  HasType,
  HasUniqueId,
  PublishesPanelTitle,
} from '@kbn/presentation-publishing';
import { ACTION_EDIT_CONTROL, ControlGroupContainer, CONTROL_GROUP_TYPE } from '..';
import { pluginServices } from '../../services';
import { DefaultControlInternalApi, PublishesControlDisplaySettings } from '../../types';
import { ControlGroupStrings } from '../control_group_strings';
import { ControlGroupContainerContext, setFlyoutRef } from '../embeddable/control_group_container';
import { DeleteControlAction } from './delete_control_action';
import { EditControlFlyout } from './edit_control_flyout';

export type EditControlActionApi = HasType &
  HasUniqueId &
  PublishesPanelTitle &
  HasEditCapabilities &
  PublishesControlDisplaySettings &
  DefaultControlInternalApi &
  HasParentApi<PresentationContainer & HasType>;

const isApiCompatible = (api: unknown | null): api is EditControlActionApi =>
  Boolean(
    apiHasType(api) &&
      apiHasUniqueId(api) &&
      hasEditCapabilities(api) &&
      apiHasParentApi(api) &&
      apiCanAccessViewMode(api.parentApi) &&
      apiIsOfType(api.parentApi, CONTROL_GROUP_TYPE) &&
      apiIsPresentationContainer(api.parentApi)
  );

export class EditControlAction implements Action<EmbeddableApiContext> {
  public readonly type = ACTION_EDIT_CONTROL;
  public readonly id = ACTION_EDIT_CONTROL;
  public order = 2;

  private openFlyout;
  private theme;
  private i18n;

  constructor(private deleteControlAction: DeleteControlAction) {
    ({
      overlays: { openFlyout: this.openFlyout },
      core: { theme: this.theme, i18n: this.i18n },
    } = pluginServices.getServices());
  }

  public readonly MenuItem = ({ context }: { context: EmbeddableApiContext }) => {
    if (!isApiCompatible(context.embeddable)) throw new IncompatibleActionError();
    return (
      <EuiToolTip content={this.getDisplayName(context)}>
        <EuiButtonIcon
          data-test-subj={`control-action-${context.embeddable.uuid}-edit`}
          aria-label={this.getDisplayName(context)}
          iconType={this.getIconType(context)}
          onClick={() => this.execute(context)}
          color="text"
        />
      </EuiToolTip>
    );
  };

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return ControlGroupStrings.floatingActions.getEditButtonTitle();
  }

  public getIconType({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return 'pencil';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    return (
      isApiCompatible(embeddable) &&
      getInheritedViewMode(embeddable.parentApi) === ViewMode.EDIT &&
      embeddable.isEditingEnabled()
    );
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();

    const controlGroup = embeddable.parentApi as ControlGroupContainer;
    const flyoutInstance = this.openFlyout(
      toMountPoint(
        <ControlGroupContainerContext.Provider value={controlGroup}>
          <EditControlFlyout
            embeddable={embeddable}
            removeControl={() => this.deleteControlAction.execute({ embeddable })}
            closeFlyout={() => {
              setFlyoutRef(undefined);
              flyoutInstance.close();
            }}
          />
        </ControlGroupContainerContext.Provider>,

        { theme: this.theme, i18n: this.i18n }
      ),
      {
        'aria-label': ControlGroupStrings.manageControl.getFlyoutEditTitle(),
        outsideClickCloses: false,
        onClose: (flyout) => {
          setFlyoutRef(undefined);
          flyout.close();
        },
        ownFocus: true,
      }
    );
    setFlyoutRef(flyoutInstance);
  }
}
