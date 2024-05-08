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
  PublishesWritablePanelTitle,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import { PublishesDataView } from '@kbn/presentation-publishing/interfaces/publishes_data_views';
import { ACTION_EDIT_CONTROL, ControlGroupContainer, CONTROL_GROUP_TYPE } from '..';
import { pluginServices } from '../../services';
import { ControlWidth, DefaultControlApi, PublishesControlDisplaySettings } from '../../types';
import { ControlGroupStrings } from '../control_group_strings';
import { ControlGroupContainerContext, setFlyoutRef } from '../embeddable/control_group_container';
import { DeleteControlAction } from './delete_control_action';
import { EditControlFlyout } from './edit_control_flyout';
import { ControlEditor } from '../editor/control_editor';
import { BehaviorSubject } from 'rxjs';

export type EditControlActionApi = DefaultControlApi;

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
  private dataViewsService;

  constructor(private deleteControlAction: DeleteControlAction) {
    ({
      overlays: { openFlyout: this.openFlyout },
      core: { theme: this.theme, i18n: this.i18n },
      dataViews: this.dataViewsService,
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

    const selectedDataViewId: string | undefined =
      embeddable.dataView.getValue()?.id ??
      embeddable.parentApi.lastUsedDataViewId?.getValue() ??
      embeddable.parentApi.dataViews.getValue()?.[0].id ??
      (await this.dataViewsService.getDefaultId()) ??
      undefined; // getDefaultId returns null rather than undefined, so catch that
    const controlGrow = embeddable.grow$.getValue();

    const stateManager = {
      dataViewId$: new BehaviorSubject<string | undefined>(selectedDataViewId),
      fieldName$: new BehaviorSubject<string | undefined>(embeddable.fieldName$.getValue()),
      grow: new BehaviorSubject<boolean | undefined>(
        controlGrow === undefined ? embeddable.parentApi.defaultGrow$.getValue() : controlGrow
      ),
      width: new BehaviorSubject<ControlWidth | undefined>(
        embeddable.width$.getValue() ?? embeddable.parentApi.defaultWidth$.getValue()
      ),
      settings: new BehaviorSubject<object | undefined>(embeddable.settings),
    };

    console.log('stateManager', stateManager);

    const flyoutInstance = this.openFlyout(
      toMountPoint(
        <ControlEditor
          api={embeddable}
          parentApi={embeddable.parentApi}
          stateManager={stateManager}
          // isCreate={false}
          // width={controlWidth ?? defaultControlWidth}
          // grow={controlGrow === undefined ? defaultControlGrow : controlGrow}
          // embeddable={embeddable}
          // onCancel={onCancel}
          // setLastUsedDataViewId={(lastUsed) => controlGroup.setLastUsedDataViewId(lastUsed)}
          // onSave={onSave}
          // removeControl={() => {
          //   closeFlyout();
          //   removeControl();
          // }}
        />,
        // <EditControlFlyout
        //   api={embeddable}
        //   removeControl={() => this.deleteControlAction.execute({ embeddable })}
        //   closeFlyout={() => {
        //     setFlyoutRef(undefined);
        //     flyoutInstance.close();
        //   }}
        // />,

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
