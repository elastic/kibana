/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { StateComparators } from '@kbn/presentation-publishing';
import { BehaviorSubject, distinctUntilChanged, skip } from 'rxjs';
import {
  DataControlApi,
  DefaultControlApi,
  DefaultControlState,
  DefaultDataControlState,
} from './types';

type DiffDefaultDataControlState = Omit<DefaultDataControlState, keyof DefaultControlState>;
type DiffDefaultDataControlApi = Omit<DataControlApi, keyof DefaultControlApi>;

export const initializeDataControl = <State extends DefaultDataControlState>(
  state: State,
  dataViewsService: DataViewsPublicPluginStart
): {
  dataControlApi: DiffDefaultDataControlApi;
  dataControlComparators: StateComparators<DiffDefaultDataControlState>;
  stateManager: {
    [key in keyof Required<DiffDefaultDataControlState>]: BehaviorSubject<
      DiffDefaultDataControlState[key]
    >;
  };
} => {
  const panelTitle = new BehaviorSubject<string | undefined>(state.title);
  const defaultPanelTitle = new BehaviorSubject<string | undefined>(state.fieldName);
  const dataViewId = new BehaviorSubject<string>(state.dataViewId);
  const fieldName = new BehaviorSubject<string>(state.fieldName);
  const dataView = new BehaviorSubject<DataView | undefined>(undefined);

  const dataControlComparators: StateComparators<DiffDefaultDataControlState> = {
    title: [panelTitle, (value: string | undefined) => panelTitle.next(value)],
    dataViewId: [dataViewId, (value: string) => dataViewId.next(value)],
    fieldName: [fieldName, (value: string) => fieldName.next(value)],
  };

  const stateManager = {
    dataViewId,
    fieldName,
    title: panelTitle,
  };

  /**
   * The default panel title will always be the same as the field name, so keep these two things in sync;
   * Skip the first fired event because it was initialized above
   */
  fieldName.pipe(skip(1), distinctUntilChanged()).subscribe((newFieldName) => {
    defaultPanelTitle.next(newFieldName);
  });

  /**
   * Fetch the data view whenever the selected id changes
   */
  dataViewId.pipe(distinctUntilChanged()).subscribe(async (id: string) => {
    // defaultApi.dataLoading.next(true);
    dataView.next(await dataViewsService.get(id));
    // defaultApi.dataLoading.next(false);
  });

  const onEdit = async () => {
    console.log('on edit');

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
  };

  const dataControlApi: DiffDefaultDataControlApi = {
    panelTitle,
    defaultPanelTitle,
    dataView,
    onEdit,
    isEditingEnabled: () => true, // TODO
    getTypeDisplayName: () => 'Test', // TODO
  };

  return {
    stateManager,
    dataControlApi,
    dataControlComparators,
  };
};
