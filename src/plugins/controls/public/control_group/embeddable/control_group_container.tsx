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
import { EMPTY, merge, pipe, Subscription, concat } from 'rxjs';
import {
  distinctUntilChanged,
  debounceTime,
  catchError,
  switchMap,
  map,
  take,
} from 'rxjs/operators';
import { EuiContextMenuPanel, EuiHorizontalRule } from '@elastic/eui';

import {
  ControlGroupInput,
  ControlGroupOutput,
  ControlPanelState,
  CONTROL_GROUP_TYPE,
} from '../types';
import {
  withSuspense,
  LazyReduxEmbeddableWrapper,
  ReduxEmbeddableWrapperPropsWithChildren,
  SolutionToolbarPopover,
} from '../../../../presentation_util/public';
import { pluginServices } from '../../services';
import { DataView } from '../../../../data_views/public';
import { DEFAULT_CONTROL_WIDTH } from '../editor/editor_constants';
import { ControlGroup } from '../component/control_group_component';
import { controlGroupReducers } from '../state/control_group_reducers';
import { ControlEmbeddable, ControlInput, ControlOutput } from '../../types';
import { Container, EmbeddableFactory } from '../../../../embeddable/public';
import { CreateControlButton, CreateControlButtonTypes } from '../editor/create_control';
import { EditControlGroup } from '../editor/edit_control_group';
import { ControlGroupStrings } from '../control_group_strings';

const ControlGroupReduxWrapper = withSuspense<
  ReduxEmbeddableWrapperPropsWithChildren<ControlGroupInput>
>(LazyReduxEmbeddableWrapper);

export class ControlGroupContainer extends Container<
  ControlInput,
  ControlGroupInput,
  ControlGroupOutput
> {
  public readonly type = CONTROL_GROUP_TYPE;
  private subscriptions: Subscription = new Subscription();
  private domNode?: HTMLElement;

  public untilReady = () => {
    const panelsLoading = () =>
      Object.values(this.getOutput().embeddableLoaded).some((loaded) => !loaded);
    if (panelsLoading()) {
      return new Promise<void>((resolve, reject) => {
        const subscription = merge(this.getOutput$(), this.getInput$()).subscribe(() => {
          if (this.destroyed) reject();
          if (!panelsLoading()) {
            subscription.unsubscribe();
            resolve();
          }
        });
      });
    }
    return Promise.resolve();
  };

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
    return (
      <CreateControlButton
        buttonType={buttonType}
        defaultControlWidth={this.getInput().defaultControlWidth}
        updateDefaultWidth={(defaultControlWidth) => this.updateInput({ defaultControlWidth })}
        addNewEmbeddable={(type, input) => this.addNewEmbeddable(type, input)}
        closePopover={closePopover}
      />
    );
  };

  private getEditControlGroupButton = (closePopover: () => void) => {
    return (
      <EditControlGroup
        controlStyle={this.getInput().controlStyle}
        panels={this.getInput().panels}
        defaultControlWidth={this.getInput().defaultControlWidth}
        setControlStyle={(controlStyle) => this.updateInput({ controlStyle })}
        setDefaultControlWidth={(defaultControlWidth) => this.updateInput({ defaultControlWidth })}
        setAllControlWidths={(defaultControlWidth) => {
          Object.keys(this.getInput().panels).forEach(
            (panelId) => (this.getInput().panels[panelId].width = defaultControlWidth)
          );
        }}
        removeEmbeddable={(id) => this.removeEmbeddable(id)}
        closePopover={closePopover}
      />
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
              <EuiHorizontalRule margin="none" />,
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
      parent
    );
    const anyChildChangePipe = pipe(
      map(() => this.getChildIds()),
      distinctUntilChanged(deepEqual),

      // children may change, so make sure we subscribe/unsubscribe with switchMap
      switchMap((newChildIds: string[]) =>
        merge(
          ...newChildIds.map((childId) =>
            this.getChild(childId)
              .getOutput$()
              // Embeddables often throw errors into their output streams.
              .pipe(catchError(() => EMPTY))
          )
        )
      )
    );

    this.subscriptions.add(
      concat(
        merge(this.getOutput$(), this.getOutput$().pipe(anyChildChangePipe)).pipe(take(1)), // the first time filters are built, don't debounce so that initial filters are built immediately
        merge(this.getOutput$(), this.getOutput$().pipe(anyChildChangePipe)).pipe(debounceTime(10))
      ).subscribe(this.recalculateOutput)
    );
  }

  public getPanelCount = () => {
    return Object.keys(this.getInput().panels).length;
  };

  private recalculateOutput = () => {
    const allFilters: Filter[] = [];
    const allDataViews: DataView[] = [];
    Object.values(this.children).map((child) => {
      const childOutput = child.getOutput() as ControlOutput;
      allFilters.push(...(childOutput?.filters ?? []));
      allDataViews.push(...(childOutput.dataViews ?? []));
    });
    this.updateOutput({ filters: uniqFilters(allFilters), dataViews: uniqBy(allDataViews, 'id') });
  };

  protected createNewPanelState<TEmbeddableInput extends ControlInput = ControlInput>(
    factory: EmbeddableFactory<ControlInput, ControlOutput, ControlEmbeddable>,
    partial: Partial<TEmbeddableInput> = {}
  ): ControlPanelState<TEmbeddableInput> {
    const panelState = super.createNewPanelState(factory, partial);
    const highestOrder = Object.values(this.getInput().panels).reduce((highestSoFar, panel) => {
      if (panel.order > highestSoFar) highestSoFar = panel.order;
      return highestSoFar;
    }, 0);
    return {
      order: highestOrder + 1,
      width: this.getInput().defaultControlWidth ?? DEFAULT_CONTROL_WIDTH,
      ...panelState,
    } as ControlPanelState<TEmbeddableInput>;
  }

  protected getInheritedInput(id: string): ControlInput {
    const { filters, query, ignoreParentSettings, timeRange } = this.getInput();
    return {
      filters: ignoreParentSettings?.ignoreFilters ? undefined : filters,
      query: ignoreParentSettings?.ignoreQuery ? undefined : query,
      timeRange: ignoreParentSettings?.ignoreTimerange ? undefined : timeRange,
      id,
    };
  }

  public destroy() {
    super.destroy();
    this.subscriptions.unsubscribe();
    if (this.domNode) ReactDOM.unmountComponentAtNode(this.domNode);
  }

  public render(dom: HTMLElement) {
    if (this.domNode) {
      ReactDOM.unmountComponentAtNode(this.domNode);
    }
    this.domNode = dom;
    const PresentationUtilProvider = pluginServices.getContextProvider();
    ReactDOM.render(
      <PresentationUtilProvider>
        <ControlGroupReduxWrapper embeddable={this} reducers={controlGroupReducers}>
          <ControlGroup />
        </ControlGroupReduxWrapper>
      </PresentationUtilProvider>,
      dom
    );
  }
}
