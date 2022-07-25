/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { uniqBy } from 'lodash';
import ReactDOM from 'react-dom';
import deepEqual from 'fast-deep-equal';
import { Filter, uniqFilters } from '@kbn/es-query';
import { EMPTY, merge, pipe, Subject, Subscription } from 'rxjs';
import { EuiContextMenuPanel } from '@elastic/eui';
import {
  distinctUntilChanged,
  debounceTime,
  catchError,
  switchMap,
  map,
  skip,
  mapTo,
} from 'rxjs/operators';

import {
  withSuspense,
  LazyReduxEmbeddableWrapper,
  ReduxEmbeddableWrapperPropsWithChildren,
  SolutionToolbarPopover,
} from '@kbn/presentation-util-plugin/public';
import { OverlayRef } from '@kbn/core/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { Container, EmbeddableFactory } from '@kbn/embeddable-plugin/public';

import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import {
  ControlGroupInput,
  ControlGroupOutput,
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
import { ControlGroupStrings } from '../control_group_strings';
import { EditControlGroup } from '../editor/edit_control_group';
import { ControlGroup } from '../component/control_group_component';
import { controlGroupReducers } from '../state/control_group_reducers';
import { ControlEmbeddable, ControlInput, ControlOutput } from '../../types';
import { CreateControlButton, CreateControlButtonTypes } from '../editor/create_control';

const ControlGroupReduxWrapper = withSuspense<
  ReduxEmbeddableWrapperPropsWithChildren<ControlGroupInput>
>(LazyReduxEmbeddableWrapper);

let flyoutRef: OverlayRef | undefined;
export const setFlyoutRef = (newRef: OverlayRef | undefined) => {
  flyoutRef = newRef;
};

export class ControlGroupContainer extends Container<
  ControlInput,
  ControlGroupInput,
  ControlGroupOutput
> {
  public readonly type = CONTROL_GROUP_TYPE;

  private subscriptions: Subscription = new Subscription();
  private domNode?: HTMLElement;
  private recalculateFilters$: Subject<null>;

  private relevantDataViewId?: string;
  private lastUsedDataViewId?: string;

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

  /**
   * Returns a button that allows controls to be created externally using the embeddable
   * @param buttonType Controls the button styling
   * @param closePopover Closes the create control menu popover when flyout opens - only necessary if `buttonType === 'toolbar'`
   * @return If `buttonType == 'toolbar'`, returns `EuiContextMenuPanel` with input control types as items.
   *         Otherwise, if `buttonType == 'callout'` returns `EuiButton` with popover containing input control types.
   */
  public getCreateControlButton = (
    buttonType: CreateControlButtonTypes,
    closePopover?: () => void
  ) => {
    const ControlsServicesProvider = pluginServices.getContextProvider();

    return (
      <ControlsServicesProvider>
        <CreateControlButton
          buttonType={buttonType}
          defaultControlWidth={this.getInput().defaultControlWidth}
          defaultControlGrow={this.getInput().defaultControlGrow}
          updateDefaultWidth={(defaultControlWidth) => this.updateInput({ defaultControlWidth })}
          updateDefaultGrow={(defaultControlGrow: boolean) =>
            this.updateInput({ defaultControlGrow })
          }
          addNewEmbeddable={(type, input) => this.addNewEmbeddable(type, input)}
          closePopover={closePopover}
          getRelevantDataViewId={() => this.getMostRelevantDataViewId()}
          setLastUsedDataViewId={(newId) => this.setLastUsedDataViewId(newId)}
        />
      </ControlsServicesProvider>
    );
  };

  private getEditControlGroupButton = (closePopover: () => void) => {
    const ControlsServicesProvider = pluginServices.getContextProvider();

    return (
      <ControlsServicesProvider>
        <EditControlGroup controlGroupContainer={this} closePopover={closePopover} />
      </ControlsServicesProvider>
    );
  };

  /**
   * Returns the toolbar button that is used for creating controls and managing control settings
   * @return `SolutionToolbarPopover` button for input controls
   */
  public getToolbarButtons = () => {
    return (
      <SolutionToolbarPopover
        ownFocus
        label={ControlGroupStrings.getControlButtonTitle()}
        iconType="arrowDown"
        iconSide="right"
        panelPaddingSize="none"
        data-test-subj="dashboard-controls-menu-button"
      >
        {({ closePopover }: { closePopover: () => void }) => (
          <EuiContextMenuPanel
            items={[
              this.getCreateControlButton('toolbar', closePopover),
              this.getEditControlGroupButton(closePopover),
            ]}
          />
        )}
      </SolutionToolbarPopover>
    );
  };

  constructor(initialInput: ControlGroupInput, parent?: Container) {
    super(
      initialInput,
      { embeddableLoaded: {} },
      pluginServices.getServices().controls.getControlFactory,
      parent,
      ControlGroupChainingSystems[initialInput.chainingSystem]?.getContainerSettings(initialInput)
    );

    this.recalculateFilters$ = new Subject();

    // when all children are ready setup subscriptions
    this.untilReady().then(() => {
      this.recalculateDataViews();
      this.recalculateFilters();
      this.setupSubscriptions();
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
     * Create a pipe that outputs the child's ID, any time any child's output changes.
     */
    const anyChildChangePipe = pipe(
      map(() => this.getChildIds()),
      distinctUntilChanged(deepEqual),

      // children may change, so make sure we subscribe/unsubscribe with switchMap
      switchMap((newChildIds: string[]) =>
        merge(
          ...newChildIds.map((childId) =>
            this.getChild(childId)
              .getOutput$()
              .pipe(
                // Embeddables often throw errors into their output streams.
                catchError(() => EMPTY),
                mapTo(childId)
              )
          )
        )
      )
    );

    /**
     * run OnChildOutputChanged when any child's output has changed
     */
    this.subscriptions.add(
      this.getOutput$()
        .pipe(anyChildChangePipe)
        .subscribe((childOutputChangedId) => {
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

  public getPanelCount = () => {
    return Object.keys(this.getInput().panels).length;
  };

  private recalculateFilters = () => {
    const allFilters: Filter[] = [];
    Object.values(this.children).map((child) => {
      const childOutput = child.getOutput() as ControlOutput;
      allFilters.push(...(childOutput?.filters ?? []));
    });
    this.updateOutput({ filters: uniqFilters(allFilters) });
  };

  private recalculateDataViews = () => {
    const allDataViews: DataView[] = [];
    Object.values(this.children).map((child) => {
      const childOutput = child.getOutput() as ControlOutput;
      allDataViews.push(...(childOutput.dataViews ?? []));
    });
    this.updateOutput({ dataViews: uniqBy(allDataViews, 'id') });
  };

  protected createNewPanelState<TEmbeddableInput extends ControlInput = ControlInput>(
    factory: EmbeddableFactory<ControlInput, ControlOutput, ControlEmbeddable>,
    partial: Partial<TEmbeddableInput> = {}
  ): ControlPanelState<TEmbeddableInput> {
    const panelState = super.createNewPanelState(factory, partial);
    let nextOrder = 0;
    if (Object.keys(this.getInput().panels).length > 0) {
      nextOrder =
        Object.values(this.getInput().panels).reduce((highestSoFar, panel) => {
          if (panel.order > highestSoFar) highestSoFar = panel.order;
          return highestSoFar;
        }, 0) + 1;
    }
    return {
      order: nextOrder,
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
      ...(precedingFilters ?? []),
    ];
    return {
      ignoreParentSettings,
      filters: allFilters,
      query: ignoreParentSettings?.ignoreQuery ? undefined : query,
      timeRange: ignoreParentSettings?.ignoreTimerange ? undefined : timeRange,
      id,
    };
  }

  public untilReady = () => {
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

  public render(dom: HTMLElement) {
    if (this.domNode) {
      ReactDOM.unmountComponentAtNode(this.domNode);
    }
    this.domNode = dom;
    const ControlsServicesProvider = pluginServices.getContextProvider();
    ReactDOM.render(
      <KibanaThemeProvider theme$={pluginServices.getServices().theme.theme$}>
        <ControlsServicesProvider>
          <ControlGroupReduxWrapper embeddable={this} reducers={controlGroupReducers}>
            <ControlGroup />
          </ControlGroupReduxWrapper>
        </ControlsServicesProvider>
      </KibanaThemeProvider>,
      dom
    );
  }

  public destroy() {
    super.destroy();
    this.closeAllFlyouts();
    this.subscriptions.unsubscribe();
    if (this.domNode) ReactDOM.unmountComponentAtNode(this.domNode);
  }
}
