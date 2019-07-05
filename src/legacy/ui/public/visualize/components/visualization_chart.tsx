/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import * as Rx from 'rxjs';
import { debounceTime, filter, share, switchMap, tap } from 'rxjs/operators';

import { PersistedState } from '../../persisted_state';
import { dispatchRenderComplete, dispatchRenderStart } from '../../render_complete';
import { ResizeChecker } from '../../resize_checker';
import { Vis, VisualizationController } from '../../vis';
import { getUpdateStatus } from '../../vis/update_status';

interface VisualizationChartProps {
  onInit?: () => void;
  uiState: PersistedState;
  vis: Vis;
  visData: any;
  visParams: any;
  listenOnChange: boolean;
}

class VisualizationChart extends React.Component<VisualizationChartProps> {
  private resizeChecker?: ResizeChecker;
  private visualization?: VisualizationController;
  private chartDiv = React.createRef<HTMLDivElement>();
  private containerDiv = React.createRef<HTMLDivElement>();
  private renderSubject: Rx.Subject<{
    vis: Vis;
    visParams: any;
    visData: any;
    container: HTMLElement;
  }>;
  private renderSubscription: Rx.Subscription;

  constructor(props: VisualizationChartProps) {
    super(props);

    this.renderSubject = new Rx.Subject();
    const render$ = this.renderSubject.asObservable().pipe(share());

    const success$ = render$.pipe(
      tap(() => {
        if (this.chartDiv.current) {
          dispatchRenderStart(this.chartDiv.current);
        }
      }),
      filter(
        ({ vis, visData, container }) => vis && container && (!vis.type.requiresSearch || visData)
      ),
      debounceTime(100),
      switchMap(async ({ vis, visData, visParams, container }) => {
        if (!this.visualization) {
          // This should never happen, since we only should trigger another rendering
          // after this component has mounted and thus the visualization implementation
          // has been initialized
          throw new Error('Visualization implementation was not initialized on first render.');
        }

        vis.size = [container.clientWidth, container.clientHeight];
        const status = getUpdateStatus(vis.type.requiresUpdateStatus, this, this.props);
        return this.visualization.render(visData, visParams, status);
      })
    );

    const requestError$ = render$.pipe(filter(({ vis }) => vis.requestError));

    this.renderSubscription = Rx.merge(success$, requestError$).subscribe(() => {
      if (this.chartDiv.current !== null) {
        dispatchRenderComplete(this.chartDiv.current);
      }
    });
  }

  public render() {
    return (
      <div className="visChart__container kbn-resetFocusState" tabIndex={0} ref={this.containerDiv}>
        <p className="euiScreenReaderOnly">
          {this.props.vis.type.title} visualization, not yet accessible
        </p>
        <div
          aria-hidden={!this.props.vis.type.isAccessible}
          className="visChart"
          ref={this.chartDiv}
        />
      </div>
    );
  }

  public componentDidMount() {
    if (!this.chartDiv.current || !this.containerDiv.current) {
      throw new Error('chartDiv and currentDiv reference should always be present.');
    }

    const { vis, onInit } = this.props;
    const Visualization = vis.type.visualization;

    this.visualization = new Visualization(this.chartDiv.current, vis);

    if (onInit) {
      // In case the visualization implementation has an isLoaded function, we
      // call that and wait for the result to resolve (in case it was a promise).
      const visLoaded = this.visualization.isLoaded && this.visualization.isLoaded();
      Promise.resolve(visLoaded).then(onInit);
    }

    // We know that containerDiv.current will never be null, since we will always
    // have rendered and the div is always rendered into the tree (i.e. not
    // inside any condition).
    this.resizeChecker = new ResizeChecker(this.containerDiv.current);
    this.resizeChecker.on('resize', () => this.startRenderVisualization());

    if (this.props.listenOnChange) {
      this.props.uiState.on('change', this.onUiStateChanged);
    }

    this.startRenderVisualization();
  }

  public componentDidUpdate() {
    this.startRenderVisualization();
  }

  public componentWillUnmount() {
    if (this.renderSubscription) {
      this.renderSubscription.unsubscribe();
    }
    if (this.resizeChecker) {
      this.resizeChecker.destroy();
    }
    if (this.visualization) {
      this.visualization.destroy();
    }
  }

  private onUiStateChanged = () => {
    this.startRenderVisualization();
  };

  private startRenderVisualization(): void {
    if (this.containerDiv.current && this.chartDiv.current) {
      this.renderSubject.next({
        vis: this.props.vis,
        visData: this.props.visData,
        visParams: this.props.visParams,
        container: this.containerDiv.current,
      });
    }
  }
}

export { VisualizationChart };
