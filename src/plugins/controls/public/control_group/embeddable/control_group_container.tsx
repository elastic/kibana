/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { skip, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import React, { createContext, useContext } from 'react';
import ReactDOM from 'react-dom';
import { compareFilters, COMPARE_ALL_OPTIONS, Filter, uniqFilters } from '@kbn/es-query';
import { BehaviorSubject, merge, Subject, Subscription } from 'rxjs';
import _ from 'lodash';

import { ReduxEmbeddablePackage, ReduxEmbeddableTools } from '@kbn/presentation-util-plugin/public';
import { OverlayRef } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { Container, EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import {
  ControlGroupInput,
  ControlGroupOutput,
  ControlGroupReduxState,
  ControlPanelState,
  ControlsPanels,
  CONTROL_GROUP_TYPE,
} from '../types';
import {
  cachedChildEmbeddableOrder,
  ControlGroupChainingSystems,
  controlOrdersAreEqual,
} from './control_group_chaining_system';
import { pluginServices } from '../../services';
import { openAddDataControlFlyout } from '../editor/open_add_data_control_flyout';
import { EditControlGroup } from '../editor/edit_control_group';
import { ControlGroup } from '../component/control_group_component';
import { controlGroupReducers } from '../state/control_group_reducers';
import { ControlEmbeddable, ControlInput, ControlOutput } from '../../types';
import { getNextPanelOrder } from './control_group_helpers';
import type {
  AddDataControlProps,
  AddOptionsListControlProps,
  AddRangeSliderControlProps,
} from '../control_group_input_builder';
import {
  getDataControlPanelState,
  getOptionsListPanelState,
  getRangeSliderPanelState,
  getTimeSliderPanelState,
} from '../control_group_input_builder';

let flyoutRef: OverlayRef | undefined;
export const setFlyoutRef = (newRef: OverlayRef | undefined) => {
  flyoutRef = newRef;
};

export const ControlGroupContainerContext = createContext<ControlGroupContainer | null>(null);
export const useControlGroupContainer = (): ControlGroupContainer => {
  const controlGroup = useContext<ControlGroupContainer | null>(ControlGroupContainerContext);
  if (controlGroup == null) {
    throw new Error('useControlGroupContainer must be used inside ControlGroupContainerContext.');
  }
  return controlGroup!;
};

type ControlGroupReduxEmbeddableTools = ReduxEmbeddableTools<
  ControlGroupReduxState,
  typeof controlGroupReducers
>;

export class ControlGroupContainer extends Container<
  ControlInput,
  ControlGroupInput,
  ControlGroupOutput
> {
  public readonly type = CONTROL_GROUP_TYPE;
  public readonly anyControlOutputConsumerLoading$: Subject<boolean> = new Subject();

  private initialized$ = new BehaviorSubject(false);

  private subscriptions: Subscription = new Subscription();
  private domNode?: HTMLElement;
  private recalculateFilters$: Subject<null>;
  private relevantDataViewId?: string;
  private lastUsedDataViewId?: string;

  // state management
  public select: ControlGroupReduxEmbeddableTools['select'];
  public getState: ControlGroupReduxEmbeddableTools['getState'];
  public dispatch: ControlGroupReduxEmbeddableTools['dispatch'];
  public onStateChange: ControlGroupReduxEmbeddableTools['onStateChange'];

  private cleanupStateTools: () => void;

  public onFiltersPublished$: Subject<Filter[]>;
  public onControlRemoved$: Subject<string>;

  constructor(
    reduxEmbeddablePackage: ReduxEmbeddablePackage,
    initialInput: ControlGroupInput,
    parent?: Container
  ) {
    super(
      initialInput,
      { dataViewIds: [], embeddableLoaded: {}, filters: [] },
      pluginServices.getServices().controls.getControlFactory,
      parent,
      ControlGroupChainingSystems[initialInput.chainingSystem]?.getContainerSettings(initialInput)
    );

    this.recalculateFilters$ = new Subject();
    this.onFiltersPublished$ = new Subject<Filter[]>();
    this.onControlRemoved$ = new Subject<string>();

    // build redux embeddable tools
    const reduxEmbeddableTools = reduxEmbeddablePackage.createTools<
      ControlGroupReduxState,
      typeof controlGroupReducers
    >({
      embeddable: this,
      reducers: controlGroupReducers,
    });

    this.select = reduxEmbeddableTools.select;
    this.getState = reduxEmbeddableTools.getState;
    this.dispatch = reduxEmbeddableTools.dispatch;
    this.cleanupStateTools = reduxEmbeddableTools.cleanup;
    this.onStateChange = reduxEmbeddableTools.onStateChange;

    // when all children are ready setup subscriptions
    this.untilAllChildrenReady().then(() => {
      this.recalculateDataViews();
      this.recalculateFilters();
      this.setupSubscriptions();
      this.initialized$.next(true);
    });
  }

  private setupSubscriptions = () => {
    /**
     * refresh control order cache and make all panels refreshInputFromParent whenever panel orders change
     */
    this.subscriptions.add(
      this.getInput$()
        .pipe(
          skip(1),
          distinctUntilChanged((a, b) => controlOrdersAreEqual(a.panels, b.panels))
        )
        .subscribe((input) => {
          this.recalculateDataViews();
          this.recalculateFilters();
          const childOrderCache = cachedChildEmbeddableOrder(input.panels);
          childOrderCache.idsInOrder.forEach((id) => this.getChild(id)?.refreshInputFromParent());
        })
    );

    /**
     * run OnChildOutputChanged when any child's output has changed
     */
    this.subscriptions.add(
      this.getAnyChildOutputChange$().subscribe((childOutputChangedId) => {
        this.recalculateDataViews();
        ControlGroupChainingSystems[this.getInput().chainingSystem].onChildChange({
          childOutputChangedId,
          childOrder: cachedChildEmbeddableOrder(this.getInput().panels),
          getChild: (id) => this.getChild(id),
          recalculateFilters$: this.recalculateFilters$,
        });
      })
    );

    /**
     * debounce output recalculation
     */
    this.subscriptions.add(
      this.recalculateFilters$.pipe(debounceTime(10)).subscribe(() => this.recalculateFilters())
    );
  };

  public setLastUsedDataViewId = (lastUsedDataViewId: string) => {
    this.lastUsedDataViewId = lastUsedDataViewId;
  };

  public setRelevantDataViewId = (newRelevantDataViewId: string) => {
    this.relevantDataViewId = newRelevantDataViewId;
  };

  public getMostRelevantDataViewId = () => {
    return this.lastUsedDataViewId ?? this.relevantDataViewId;
  };

  public closeAllFlyouts() {
    flyoutRef?.close();
    flyoutRef = undefined;
  }

  public async addDataControlFromField(controlProps: AddDataControlProps) {
    const panelState = await getDataControlPanelState(this.getInput(), controlProps);
    return this.createAndSaveEmbeddable(panelState.type, panelState);
  }

  public addOptionsListControl(controlProps: AddOptionsListControlProps) {
    const panelState = getOptionsListPanelState(this.getInput(), controlProps);
    return this.createAndSaveEmbeddable(panelState.type, panelState);
  }

  public addRangeSliderControl(controlProps: AddRangeSliderControlProps) {
    const panelState = getRangeSliderPanelState(this.getInput(), controlProps);
    return this.createAndSaveEmbeddable(panelState.type, panelState);
  }

  public addTimeSliderControl() {
    const panelState = getTimeSliderPanelState(this.getInput());
    return this.createAndSaveEmbeddable(panelState.type, panelState);
  }

  public openAddDataControlFlyout = openAddDataControlFlyout;

  public getEditControlGroupButton = (closePopover: () => void) => {
    const ControlsServicesProvider = pluginServices.getContextProvider();

    return (
      <ControlsServicesProvider>
        <EditControlGroup controlGroupContainer={this} closePopover={closePopover} />
      </ControlsServicesProvider>
    );
  };

  public getPanelCount = () => {
    return Object.keys(this.getInput().panels).length;
  };

  public updateFilterContext = (filters: Filter[]) => {
    this.updateInput({ filters });
  };

  private recalculateFilters = () => {
    const allFilters: Filter[] = [];
    let timeslice;
    Object.values(this.children).map((child) => {
      const childOutput = child.getOutput() as ControlOutput;
      allFilters.push(...(childOutput?.filters ?? []));
      if (childOutput.timeslice) {
        timeslice = childOutput.timeslice;
      }
    });
    // if filters are different, publish them
    if (
      !compareFilters(this.output.filters ?? [], allFilters ?? [], COMPARE_ALL_OPTIONS) ||
      !_.isEqual(this.output.timeslice, timeslice)
    ) {
      this.updateOutput({ filters: uniqFilters(allFilters), timeslice });
      this.onFiltersPublished$.next(allFilters);
    }
  };

  private recalculateDataViews = () => {
    const allDataViewIds: Set<string> = new Set();
    Object.values(this.children).map((child) => {
      const dataViewId = (child.getOutput() as ControlOutput).dataViewId;
      if (dataViewId) allDataViewIds.add(dataViewId);
    });
    this.updateOutput({ dataViewIds: Array.from(allDataViewIds) });
  };

  protected createNewPanelState<TEmbeddableInput extends ControlInput = ControlInput>(
    factory: EmbeddableFactory<ControlInput, ControlOutput, ControlEmbeddable>,
    partial: Partial<TEmbeddableInput> = {}
  ): ControlPanelState<TEmbeddableInput> {
    const panelState = super.createNewPanelState(factory, partial);
    return {
      order: getNextPanelOrder(this.getInput().panels),
      width: this.getInput().defaultControlWidth,
      grow: this.getInput().defaultControlGrow,
      ...panelState,
    } as ControlPanelState<TEmbeddableInput>;
  }

  protected onRemoveEmbeddable(idToRemove: string) {
    const newPanels = super.onRemoveEmbeddable(idToRemove) as ControlsPanels;
    const childOrderCache = cachedChildEmbeddableOrder(this.getInput().panels);
    const removedOrder = childOrderCache.IdsToOrder[idToRemove];
    for (let i = removedOrder + 1; i < childOrderCache.idsInOrder.length; i++) {
      const currentOrder = newPanels[childOrderCache.idsInOrder[i]].order;
      newPanels[childOrderCache.idsInOrder[i]] = {
        ...newPanels[childOrderCache.idsInOrder[i]],
        order: currentOrder - 1,
      };
    }
    this.onControlRemoved$.next(idToRemove);
    return newPanels;
  }

  protected getInheritedInput(id: string): ControlInput {
    const { filters, query, ignoreParentSettings, timeRange, chainingSystem, panels } =
      this.getInput();

    const precedingFilters = ControlGroupChainingSystems[chainingSystem].getPrecedingFilters({
      id,
      childOrder: cachedChildEmbeddableOrder(panels),
      getChild: (getChildId: string) => this.getChild<ControlEmbeddable>(getChildId),
    });
    const allFilters = [
      ...(ignoreParentSettings?.ignoreFilters ? [] : filters ?? []),
      ...(precedingFilters?.filters ?? []),
    ];
    return {
      ignoreParentSettings,
      filters: allFilters,
      query: ignoreParentSettings?.ignoreQuery ? undefined : query,
      timeRange: ignoreParentSettings?.ignoreTimerange ? undefined : timeRange,
      timeslice: ignoreParentSettings?.ignoreTimerange ? undefined : precedingFilters?.timeslice,
      id,
    };
  }

  public untilAllChildrenReady = () => {
    const panelsLoading = () =>
      Object.keys(this.getInput().panels).some(
        (panelId) => !this.getOutput().embeddableLoaded[panelId]
      );
    if (panelsLoading()) {
      return new Promise<void>((resolve, reject) => {
        const subscription = merge(this.getOutput$(), this.getInput$()).subscribe(() => {
          if (this.destroyed) {
            subscription.unsubscribe();
            reject();
          }
          if (!panelsLoading()) {
            subscription.unsubscribe();
            resolve();
          }
        });
      });
    }
    return Promise.resolve();
  };

  public untilInitialized = () => {
    if (this.initialized$.value === false) {
      return new Promise<void>((resolve, reject) => {
        const subscription = this.initialized$.subscribe((isInitialized) => {
          if (this.destroyed) {
            subscription.unsubscribe();
            reject();
          }
          if (isInitialized) {
            subscription.unsubscribe();
            resolve();
          }
        });
      });
    }
    return Promise.resolve();
  };

  public render(dom: HTMLElement) {
    if (this.domNode) {
      ReactDOM.unmountComponentAtNode(this.domNode);
    }
    this.domNode = dom;
    const ControlsServicesProvider = pluginServices.getContextProvider();
    ReactDOM.render(
      <KibanaThemeProvider theme$={pluginServices.getServices().theme.theme$}>
        <ControlsServicesProvider>
          <ControlGroupContainerContext.Provider value={this}>
            <ControlGroup />
          </ControlGroupContainerContext.Provider>
        </ControlsServicesProvider>
      </KibanaThemeProvider>,
      dom
    );
  }

  public destroy() {
    super.destroy();
    this.closeAllFlyouts();
    this.subscriptions.unsubscribe();
    this.cleanupStateTools();
    if (this.domNode) ReactDOM.unmountComponentAtNode(this.domNode);
  }
}
