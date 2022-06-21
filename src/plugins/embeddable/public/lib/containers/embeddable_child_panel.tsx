/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import classNames from 'classnames';
import React from 'react';

import { EuiLoadingChart } from '@elastic/eui';
import { Subscription } from 'rxjs';
import { distinct, tap, map } from 'rxjs/operators';
import { ErrorEmbeddable, IEmbeddable } from '../embeddables';
import { IContainer } from './i_container';
import { EmbeddableStart } from '../../plugin';
import { EmbeddableError, EmbeddableOutput } from '../embeddables/i_embeddable';

export type EmbeddablePhase = 'loading' | 'loaded' | 'rendered' | 'error';
export interface EmbeddablePhaseEvent {
  id: string;
  status: EmbeddablePhase;
  error?: EmbeddableError;
  timeToEvent: number;
}

export interface EmbeddableChildPanelProps {
  embeddableId: string;
  index?: number;
  className?: string;
  container: IContainer;
  PanelComponent: EmbeddableStart['EmbeddablePanel'];
  onPanelStatusChange?: (info: EmbeddablePhaseEvent) => void;
}
interface State {
  firstTimeLoading: boolean;
}

/**
 * This component can be used by embeddable containers using react to easily render children. It waits
 * for the child to be initialized, showing a loading indicator until that is complete.
 */

export class EmbeddableChildPanel extends React.Component<EmbeddableChildPanelProps, State> {
  [panel: string]: any;
  public mounted: boolean;
  public embeddable!: IEmbeddable | ErrorEmbeddable;
  private subscription?: Subscription;

  constructor(props: EmbeddableChildPanelProps) {
    super(props);
    this.state = {
      firstTimeLoading: true,
    };

    this.mounted = false;
  }

  private getEventStatus(output: EmbeddableOutput): EmbeddablePhase {
    if (output.error !== undefined) {
      return 'error';
    } else if (output.rendered === true) {
      return 'rendered';
    } else if (output.loading === false) {
      return 'loaded';
    } else {
      return 'loading';
    }
  }

  public async componentDidMount() {
    this.mounted = true;
    const { container } = this.props;

    let loadingStartTime = 0;

    this.embeddable = await container.untilEmbeddableLoaded(this.props.embeddableId);

    this.embeddable
      .getOutput$()
      .pipe(
        /**
         * Record start time if loading === true
         * Forward events only if loading === false
         */
        tap((output) => {
          if (output.loading === true) {
            loadingStartTime = performance.now();
          }
        }),
        // Map loaded event properties
        map((output): EmbeddablePhaseEvent => {
          return {
            id: this.embeddable.id,
            status: this.getEventStatus(output),
            error: output.error,
            timeToEvent: performance.now() - loadingStartTime,
          };
        }),
        // Dedupe
        distinct()
      )
      .subscribe((statusOutput) => {
        if (this.props.onPanelStatusChange) {
          this.props.onPanelStatusChange(statusOutput);
        }
      });
    if (this.mounted) {
      this.setState({ firstTimeLoading: false });
    }
  }

  public componentWillUnmount() {
    this.mounted = false;
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  public render() {
    const { PanelComponent, index } = this.props;
    const classes = classNames('embPanel', {
      'embPanel-isLoading': this.state.firstTimeLoading,
    });

    return (
      <div className={classes}>
        {this.state.firstTimeLoading || !this.embeddable ? (
          <EuiLoadingChart size="l" mono />
        ) : (
          <PanelComponent embeddable={this.embeddable} index={index} />
        )}
      </div>
    );
  }
}
