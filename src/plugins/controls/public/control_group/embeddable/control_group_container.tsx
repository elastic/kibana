/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { compareFilters, COMPARE_ALL_OPTIONS, Filter, uniqFilters } from '@kbn/es-query';
import { isEqual, pick } from 'lodash';
import React, { createContext, useContext } from 'react';
import ReactDOM from 'react-dom';
import { batch, Provider, TypedUseSelectorHook, useSelector } from 'react-redux';
import { BehaviorSubject, merge, Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, first, skip } from 'rxjs/operators';

import { OverlayRef } from '@kbn/core/public';
import { Container, EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { ReduxEmbeddableTools, ReduxToolsPackage } from '@kbn/presentation-util-plugin/public';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';

import {
  PersistableControlGroupInput,
  persistableControlGroupInputIsEqual,
  persistableControlGroupInputKeys,
} from '../../../common';
import { TimeSlice } from '../../../common/types';
import { pluginServices } from '../../services';
import { ControlsStorageService } from '../../services/storage/types';
import { ControlEmbeddable, ControlInput, ControlOutput } from '../../types';
import { ControlGroup } from '../component/control_group_component';
import { openAddDataControlFlyout } from '../editor/open_add_data_control_flyout';
import { openEditControlGroupFlyout } from '../editor/open_edit_control_group_flyout';
import {
  getDataControlPanelState,
  getOptionsListPanelState,
  getRangeSliderPanelState,
  getTimeSliderPanelState,
  type AddDataControlProps,
  type AddOptionsListControlProps,
  type AddRangeSliderControlProps,
} from '../external_api/control_group_input_builder';
import { startDiffingControlGroupState } from '../state/control_group_diffing_integration';
import { controlGroupReducers } from '../state/control_group_reducers';
import {
  ControlGroupComponentState,
  ControlGroupFilterOutput,
  ControlGroupInput,
  ControlGroupOutput,
  ControlGroupReduxState,
  ControlPanelState,
  ControlsPanels,
  CONTROL_GROUP_TYPE,
  FieldFilterPredicate,
} from '../types';
import {
  cachedChildEmbeddableOrder,
  ControlGroupChainingSystems,
  controlOrdersAreEqual,
} from './control_group_chaining_system';
import { getNextPanelOrder } from './control_group_helpers';

let flyoutRef: OverlayRef | undefined;
export const setFlyoutRef = (newRef: OverlayRef | undefined) => {
  flyoutRef = newRef;
};

export const ControlGroupContainerContext = createContext<ControlGroupContainer | null>(null);
export const controlGroupSelector = useSelector as TypedUseSelectorHook<ControlGroupReduxState>;
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

  private storageService: ControlsStorageService;

  private subscriptions: Subscription = new Subscription();
  private domNode?: HTMLElement;
  private recalculateFilters$: Subject<null>;
  private relevantDataViewId?: string;
  private lastUsedDataViewId?: string;
  private invalidSelectionsState: { [childId: string]: boolean };

  public diffingSubscription: Subscription = new Subscription();

  // state management
  public select: ControlGroupReduxEmbeddableTools['select'];
  public getState: ControlGroupReduxEmbeddableTools['getState'];
  public dispatch: ControlGroupReduxEmbeddableTools['dispatch'];
  public onStateChange: ControlGroupReduxEmbeddableTools['onStateChange'];

  private store: ControlGroupReduxEmbeddableTools['store'];

  private cleanupStateTools: () => void;

  public onFiltersPublished$: Subject<Filter[]>;
  public onControlRemoved$: Subject<string>;

  /** This currently reports the **entire** persistable control group input on unsaved changes */
  public unsavedChanges: BehaviorSubject<PersistableControlGroupInput | undefined>;

  public fieldFilterPredicate: FieldFilterPredicate | undefined;

  constructor(
    reduxToolsPackage: ReduxToolsPackage,
    initialInput: ControlGroupInput,
    parent?: Container,
    initialComponentState?: ControlGroupComponentState,
    fieldFilterPredicate?: FieldFilterPredicate
  ) {
    super(
      initialInput,
      { dataViewIds: [], embeddableLoaded: {}, filters: [] },
      pluginServices.getServices().controls.getControlFactory,
      parent,
      ControlGroupChainingSystems[initialInput.chainingSystem]?.getContainerSettings(initialInput)
    );

    ({ storage: this.storageService } = pluginServices.getServices());

    this.recalculateFilters$ = new Subject();
    this.onFiltersPublished$ = new Subject<Filter[]>();
    this.onControlRemoved$ = new Subject<string>();

    // start diffing control group state
    this.unsavedChanges = new BehaviorSubject<PersistableControlGroupInput | undefined>(undefined);
    const diffingMiddleware = startDiffingControlGroupState.bind(this)();

    // build redux embeddable tools
    const reduxEmbeddableTools = reduxToolsPackage.createReduxEmbeddableTools<
      ControlGroupReduxState,
      typeof controlGroupReducers
    >({
      embeddable: this,
      reducers: controlGroupReducers,
      additionalMiddleware: [diffingMiddleware],
      initialComponentState,
    });

    this.select = reduxEmbeddableTools.select;
    this.getState = reduxEmbeddableTools.getState;
    this.dispatch = reduxEmbeddableTools.dispatch;
    this.cleanupStateTools = reduxEmbeddableTools.cleanup;
    this.onStateChange = reduxEmbeddableTools.onStateChange;

    this.store = reduxEmbeddableTools.store;

    this.invalidSelectionsState = this.getChildIds().reduce((prev, id) => {
      return { ...prev, [id]: false };
    }, {});

    // when all children are ready setup subscriptions
    this.untilAllChildrenReady().then(() => {
      this.recalculateDataViews();
      this.setupSubscriptions();
      const { filters, timeslice } = this.recalculateFilters();
      this.publishFilters({ filters, timeslice });
      this.initialized$.next(true);
    });

    this.fieldFilterPredicate = fieldFilterPredicate;
  }

  public canShowInvalidSelectionsWarning = () =>
    this.storageService.getShowInvalidSelectionWarning() ?? true;

  public suppressInvalidSelectionsWarning = () => {
    this.storageService.setShowInvalidSelectionWarning(false);
  };

  public reportInvalidSelections = ({
    id,
    hasInvalidSelections,
  }: {
    id: string;
    hasInvalidSelections: boolean;
  }) => {
    this.invalidSelectionsState = { ...this.invalidSelectionsState, [id]: hasInvalidSelections };

    const childrenWithInvalidSelections = cachedChildEmbeddableOrder(
      this.getInput().panels
    ).idsInOrder.filter((childId) => {
      return this.invalidSelectionsState[childId];
    });
    this.dispatch.setControlWithInvalidSelectionsId(
      childrenWithInvalidSelections.length > 0 ? childrenWithInvalidSelections[0] : undefined
    );
  };

  private setupSubscriptions = () => {
    /**
     * on initialization, in order for comparison to be performed, calculate the last saved filters based on the
     * selections from the last saved input and save them to component state. This is done as a subscription so that
     * it can be done async without actually slowing down the loading of the controls.
     */
    this.subscriptions.add(
      this.initialized$
        .pipe(
          filter((isInitialized) => isInitialized),
          first()
        )
        .subscribe(async () => {
          const {
            componentState: { lastSavedInput },
            explicitInput: { panels },
          } = this.getState();
          const filterOutput = await this.calculateFiltersFromSelections(
            lastSavedInput?.panels ?? panels
          );
          this.dispatch.setLastSavedFilters(filterOutput);
        })
    );

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
          this.recalculateFilters$.next(null);
          const childOrderCache = cachedChildEmbeddableOrder(input.panels);
          childOrderCache.idsInOrder.forEach((id) => this.getChild(id)?.refreshInputFromParent());
        })
    );

    /**
     * force publish filters when `showApplySelections` value changes to keep state clean
     */
    this.subscriptions.add(
      this.getInput$()
        .pipe(
          distinctUntilChanged(
            (a, b) => Boolean(a.showApplySelections) === Boolean(b.showApplySelections)
          ),
          skip(1)
        )
        .subscribe(() => {
          const { filters, timeslice } = this.recalculateFilters();
          this.publishFilters({ filters, timeslice });
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
      this.recalculateFilters$.pipe(debounceTime(10)).subscribe(() => {
        const { filters, timeslice } = this.recalculateFilters();
        this.tryPublishFilters({ filters, timeslice });
      })
    );
  };

  public setSavedState(lastSavedInput: PersistableControlGroupInput): void {
    batch(() => {
      this.dispatch.setLastSavedInput(lastSavedInput);
      const { filters, timeslice } = this.getState().output;
      this.dispatch.setLastSavedFilters({ filters, timeslice });
    });
  }

  public resetToLastSavedState() {
    const {
      explicitInput: { showApplySelections: currentShowApplySelections },
      componentState: { lastSavedInput },
    } = this.getState();

    if (
      lastSavedInput &&
      !persistableControlGroupInputIsEqual(this.getPersistableInput(), lastSavedInput)
    ) {
      this.updateInput(lastSavedInput);
      if (currentShowApplySelections || lastSavedInput.showApplySelections) {
        /** If either the current or past state has auto-apply off, calling reset should force the changes to be published */
        this.calculateFiltersFromSelections(lastSavedInput.panels).then((filterOutput) => {
          this.publishFilters(filterOutput);
        });
      }
      this.reload(); // this forces the children to update their inputs + perform validation as necessary
    }
  }

  public reload() {
    super.reload();
  }

  public getPersistableInput: () => PersistableControlGroupInput & { id: string } = () => {
    const input = this.getInput();
    return pick(input, [...persistableControlGroupInputKeys, 'id']);
  };

  public updateInputAndReinitialize = (newInput: Partial<ControlGroupInput>) => {
    this.subscriptions.unsubscribe();
    this.subscriptions = new Subscription();
    this.initialized$.next(false);
    this.updateInput(newInput);
    this.untilAllChildrenReady().then(() => {
      this.recalculateDataViews();
      const { filters, timeslice } = this.recalculateFilters();
      this.publishFilters({ filters, timeslice });
      this.setupSubscriptions();
      this.initialized$.next(true);
    });
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
    return this.createAndSaveEmbeddable(panelState.type, panelState, this.getInput().panels);
  }

  public addOptionsListControl(controlProps: AddOptionsListControlProps) {
    const panelState = getOptionsListPanelState(this.getInput(), controlProps);
    return this.createAndSaveEmbeddable(panelState.type, panelState, this.getInput().panels);
  }

  public addRangeSliderControl(controlProps: AddRangeSliderControlProps) {
    const panelState = getRangeSliderPanelState(this.getInput(), controlProps);
    return this.createAndSaveEmbeddable(panelState.type, panelState, this.getInput().panels);
  }

  public addTimeSliderControl() {
    const panelState = getTimeSliderPanelState(this.getInput());
    return this.createAndSaveEmbeddable(panelState.type, panelState, this.getInput().panels);
  }

  public openAddDataControlFlyout = openAddDataControlFlyout;

  public openEditControlGroupFlyout = openEditControlGroupFlyout;

  public getPanelCount = () => {
    return Object.keys(this.getInput().panels).length;
  };

  public updateFilterContext = (filters: Filter[]) => {
    this.updateInput({ filters });
  };

  private recalculateFilters = (): ControlGroupFilterOutput => {
    const allFilters: Filter[] = [];
    let timeslice;
    Object.values(this.children).map((child: ControlEmbeddable) => {
      const childOutput = child.getOutput() as ControlOutput;
      allFilters.push(...(childOutput?.filters ?? []));
      if (childOutput.timeslice) {
        timeslice = childOutput.timeslice;
      }
    });
    return { filters: uniqFilters(allFilters), timeslice };
  };

  private async calculateFiltersFromSelections(
    panels: PersistableControlGroupInput['panels']
  ): Promise<ControlGroupFilterOutput> {
    let filtersArray: Filter[] = [];
    let timeslice;
    await Promise.all(
      Object.values(this.children).map(async (child) => {
        if (panels[child.id]) {
          const controlOutput =
            (await (child as ControlEmbeddable).selectionsToFilters?.(
              panels[child.id].explicitInput
            )) ?? ({} as ControlGroupFilterOutput);
          if (controlOutput.filters) {
            filtersArray = [...filtersArray, ...controlOutput.filters];
          } else if (controlOutput.timeslice) {
            timeslice = controlOutput.timeslice;
          }
        }
      })
    );
    return { filters: filtersArray, timeslice };
  }

  /**
   * If apply button is enabled, add the new filters to the  unpublished filters component state;
   * otherwise, publish new filters right away
   */
  private tryPublishFilters = ({
    filters,
    timeslice,
  }: {
    filters?: Filter[];
    timeslice?: TimeSlice;
  }) => {
    // if filters are different, try publishing them
    if (
      !compareFilters(this.output.filters ?? [], filters ?? [], COMPARE_ALL_OPTIONS) ||
      !isEqual(this.output.timeslice, timeslice)
    ) {
      const {
        explicitInput: { showApplySelections },
      } = this.getState();

      if (!showApplySelections) {
        this.publishFilters({ filters, timeslice });
      } else {
        this.dispatch.setUnpublishedFilters({ filters, timeslice });
      }
    } else {
      this.dispatch.setUnpublishedFilters(undefined);
    }
  };

  public publishFilters = ({ filters, timeslice }: ControlGroupFilterOutput) => {
    this.updateOutput({
      filters,
      timeslice,
    });
    this.dispatch.setUnpublishedFilters(undefined);
    this.onFiltersPublished$.next(filters ?? []);
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
    partial: Partial<TEmbeddableInput> = {},
    otherPanels: ControlGroupInput['panels']
  ) {
    const { newPanel } = super.createNewPanelState(factory, partial);
    return {
      newPanel: {
        order: getNextPanelOrder(this.getInput().panels),
        width: this.getInput().defaultControlWidth,
        grow: this.getInput().defaultControlGrow,
        ...newPanel,
      } as ControlPanelState<TEmbeddableInput>,
      otherPanels,
    };
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
    ReactDOM.render(
      <KibanaThemeProvider theme={pluginServices.getServices().core.theme}>
        <Provider store={this.store}>
          <ControlGroupContainerContext.Provider value={this}>
            <ControlGroup />
          </ControlGroupContainerContext.Provider>
        </Provider>
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
