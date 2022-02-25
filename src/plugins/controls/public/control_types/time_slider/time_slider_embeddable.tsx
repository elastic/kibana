/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  Filter,
  buildEsQuery,
  compareFilters,
  buildPhraseFilter,
  buildPhrasesFilter,
} from '@kbn/es-query';
import React from 'react';
import ReactDOM from 'react-dom';
import { isEqual } from 'lodash';
import deepEqual from 'fast-deep-equal';
import { merge, Subject, Subscription, BehaviorSubject } from 'rxjs';
import { tap, debounceTime, map, distinctUntilChanged, skip } from 'rxjs/operators';

//import { OptionsListComponent, OptionsListComponentState } from './options_list_component';
import {
  withSuspense,
  LazyReduxEmbeddableWrapper,
  ReduxEmbeddableWrapperPropsWithChildren,
} from '../../../../presentation_util/public';
//import { OptionsListEmbeddableInput, OPTIONS_LIST_CONTROL } from './types';
import { ControlsDataViewsService } from '../../services/data_views';
import { Embeddable, EmbeddableInput, IContainer } from '../../../../embeddable/public';
import { ControlsDataService } from '../../services/data';
import { DataView } from '../../../../data_views/public';
import { ControlInput, ControlOutput } from '../..';
import { pluginServices } from '../../services';

import { TimeSlider } from './time_slider.component';
import { TimeRange } from 'src/plugins/data/public';

interface TimesliderControlInput extends EmbeddableInput {
  timerange: TimeRange;
}

export class TimesliderControlEmbeddable extends Embeddable<any, ControlOutput> {
  public readonly type = 'TIME_SLIDER';
  public deferEmbeddableLoad = true;

  private subscriptions: Subscription = new Subscription();
  private node?: HTMLElement;

  // Controls services
  //private dataService: ControlsDataService;
  //private dataViewsService: ControlsDataViewsService;

  // Internal data fetching state for this input control.
  //private typeaheadSubject: Subject<string> = new Subject<string>();
  //private dataView?: DataView;
  //private searchString = '';

  // State to be passed down to component
  private componentState: any; //OptionsListComponentState;
  private componentStateSubject$ = new BehaviorSubject<any>({
    loading: false,
  });

  constructor(input: any, output: ControlOutput, parent?: IContainer) {
    super(input, output, parent); // get filters for initial output...

    console.log(input);

    // Destructure controls services
    //({ data: this.dataService, dataViews: this.dataViewsService } = pluginServices.getServices());

    this.componentState = { loading: false };
    //this.updateComponentState(this.componentState);

    this.initialize();
  }

  private setupSubscriptions() {
    this.subscriptions.add(
      this.getInput$()
        .pipe(
          skip(1) // skip the first input update because initial filters will be built by initialize.
        )
        .subscribe(() => undefined)
    );
  }

  private initialize() {
    this.setInitializationFinished();

    this.getInput$().pipe(tap((nextInput) => console.log(nextInput)));
  }

  public destroy = () => {
    super.destroy();
    this.subscriptions.unsubscribe();
  };

  public render = (node: HTMLElement) => {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;
    ReactDOM.render(
      <TimeSlider
        range={[1643985198009, 1644589998009]}
        onChange={() => undefined}
        value={[1643985198009, 1644589998009]}
      />,

      node
    );
  };
}
