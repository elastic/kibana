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
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { CoreStart } from '@kbn/core/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import {
  apiHasType,
  apiHasUniqueId,
  EmbeddableApiContext,
  getInheritedViewMode,
} from '@kbn/presentation-publishing';
import { DataControlApi } from '../types';

export type EditControlActionApi = DataControlApi;

const isApiCompatible = (api: unknown | null): api is EditControlActionApi =>
  Boolean(
    apiHasType(api) && apiHasUniqueId(api)
    // hasEditCapabilities(api) &&
    // apiHasParentApi(api) &&
    // apiCanAccessViewMode(api.parentApi) &&
    // apiIsOfType(api.parentApi, CONTROL_GROUP_TYPE) &&
    // apiIsPresentationContainer(api.parentApi)
  );
// edit DATA control

const ACTION_EDIT_CONTROL = 'editDataControl';

export class EditControlAction implements Action<EmbeddableApiContext> {
  public readonly type = ACTION_EDIT_CONTROL;
  public readonly id = ACTION_EDIT_CONTROL;
  public order = 2;

  private overlays;
  private theme;
  private i18n;
  private dataViewsService;

  constructor({ core, dataViews }: { core: CoreStart; dataViews: DataViewsPublicPluginStart }) {
    ({ overlays: this.overlays, theme: this.theme, i18n: this.i18n } = core);
    this.dataViewsService = dataViews;
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
    return 'Edit';
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
    console.log('execute');
  }
  //   const selectedDataViewId: string | undefined =
  //     embeddable.dataView.getValue()?.id ??
  //     embeddable.parentApi.lastUsedDataViewId?.getValue() ??
  //     embeddable.parentApi.dataViews.getValue()?.[0].id ??
  //     (await this.dataViewsService.getDefaultId()) ??
  //     undefined; // getDefaultId returns null rather than undefined, so catch that
  //   const controlGrow = embeddable.grow$.getValue();

  //   const stateManager = {
  //     dataViewId$: new BehaviorSubject<string | undefined>(selectedDataViewId),
  //     fieldName$: new BehaviorSubject<string | undefined>(embeddable.fieldName$.getValue()),
  //     grow: new BehaviorSubject<boolean | undefined>(
  //       controlGrow === undefined ? embeddable.parentApi.defaultGrow$.getValue() : controlGrow
  //     ),
  //     width: new BehaviorSubject<ControlWidth | undefined>(
  //       embeddable.width$.getValue() ?? embeddable.parentApi.defaultWidth$.getValue()
  //     ),
  //     settings: new BehaviorSubject<object | undefined>(embeddable.settings),
  //   };

  //   console.log('stateManager', stateManager);

  //   const flyoutInstance = this.overlays.openFlyout(
  //     toMountPoint(
  //       <ControlEditor
  //         api={embeddable}
  //         parentApi={embeddable.parentApi}
  //         stateManager={stateManager}
  //         closeFlyout={() => {
  //           setFlyoutRef(undefined);
  //           flyoutInstance.close();
  //         }}
  //       />,
  //       { theme: this.theme, i18n: this.i18n }
  //     ),
  //     {
  //       'aria-label': ControlGroupStrings.manageControl.getFlyoutEditTitle(),
  //       outsideClickCloses: false,
  //       onClose: (flyout) => {
  //         setFlyoutRef(undefined);
  //         flyout.close();
  //       },
  //       ownFocus: true,
  //     }
  //   );
  //   setFlyoutRef(flyoutInstance);
  // }
}
