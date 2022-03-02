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
import { EMPTY, merge, pipe, Subscription } from 'rxjs';
import { distinctUntilChanged, debounceTime, catchError, switchMap, map } from 'rxjs/operators';

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
} from '../../../../presentation_util/public';
import { pluginServices } from '../../services';
import { DataView } from '../../../../data_views/public';
import { DEFAULT_CONTROL_WIDTH } from '../editor/editor_constants';
import { ControlGroup } from '../component/control_group_component';
import { controlGroupReducers } from '../state/control_group_reducers';
import { ControlEmbeddable, ControlInput, ControlOutput } from '../../types';
import { Container, EmbeddableFactory } from '../../../../embeddable/public';

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

  constructor(initialInput: ControlGroupInput, parent?: Container) {
    super(
      initialInput,
      { embeddableLoaded: {} },
      pluginServices.getServices().controls.getControlFactory,
      parent
    );

    // when all children are ready start recalculating filters when any child's output changes
    this.untilReady().then(() => {
      this.recalculateOutput();

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
        merge(this.getOutput$(), this.getOutput$().pipe(anyChildChangePipe))
          .pipe(debounceTime(10))
          .subscribe(this.recalculateOutput)
      );
    });
  }

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
