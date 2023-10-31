/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isNil } from 'lodash';
import classNames from 'classnames';
import { distinct, map } from 'rxjs';
import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, htmlIdGenerator } from '@elastic/eui';

import { isPromise } from '@kbn/std';
import { UI_SETTINGS } from '@kbn/data-plugin/common';

import {
  EditPanelAction,
  RemovePanelAction,
  InspectPanelAction,
  CustomizePanelAction,
} from './panel_actions';
import {
  EmbeddablePhase,
  EmbeddablePhaseEvent,
  PanelUniversalActions,
  UnwrappedEmbeddablePanelProps,
} from './types';
import {
  useSelectFromEmbeddableInput,
  useSelectFromEmbeddableOutput,
} from './use_select_from_embeddable';
import { EmbeddablePanelError } from './embeddable_panel_error';
import { core, embeddableStart, inspector } from '../kibana_services';
import { ViewMode, EmbeddableErrorHandler, EmbeddableOutput } from '../lib';
import { EmbeddablePanelHeader } from './panel_header/embeddable_panel_header';

const getEventStatus = (output: EmbeddableOutput): EmbeddablePhase => {
  if (!isNil(output.error)) {
    return 'error';
  } else if (output.rendered === true) {
    return 'rendered';
  } else if (output.loading === false) {
    return 'loaded';
  } else {
    return 'loading';
  }
};

export const EmbeddablePanel = (panelProps: UnwrappedEmbeddablePanelProps) => {
  const { hideHeader, showShadow, embeddable, hideInspector, onPanelStatusChange } = panelProps;
  const [node, setNode] = useState<ReactNode | undefined>();
  const embeddableRoot: React.RefObject<HTMLDivElement> = useMemo(() => React.createRef(), []);

  const headerId = useMemo(() => htmlIdGenerator()(), []);
  const [outputError, setOutputError] = useState<Error>();

  /**
   * Universal actions are exposed on the context menu for every embeddable, they
   * bypass the trigger registry.
   */
  const universalActions = useMemo<PanelUniversalActions>(() => {
    const commonlyUsedRanges = core.uiSettings.get(UI_SETTINGS.TIMEPICKER_QUICK_RANGES);
    const dateFormat = core.uiSettings.get(UI_SETTINGS.DATE_FORMAT);
    const stateTransfer = embeddableStart.getStateTransfer();
    const editPanel = new EditPanelAction(
      embeddableStart.getEmbeddableFactory,
      core.application,
      stateTransfer
    );

    const actions: PanelUniversalActions = {
      customizePanel: new CustomizePanelAction(
        core.overlays,
        core.theme,
        editPanel,
        commonlyUsedRanges,
        dateFormat
      ),
      removePanel: new RemovePanelAction(),
      editPanel,
    };
    if (!hideInspector) actions.inspectPanel = new InspectPanelAction(inspector);
    return actions;
  }, [hideInspector]);

  /**
   * Track panel status changes
   */
  useEffect(() => {
    if (!onPanelStatusChange) return;
    let loadingStartTime = 0;

    const subscription = embeddable
      .getOutput$()
      .pipe(
        // Map loaded event properties
        map((output) => {
          if (output.loading === true) {
            loadingStartTime = performance.now();
          }
          return {
            id: embeddable.id,
            status: getEventStatus(output),
            error: output.error,
          };
        }),
        // Dedupe
        distinct((output) => loadingStartTime + output.id + output.status + !!output.error),
        // Map loaded event properties
        map((output): EmbeddablePhaseEvent => {
          return {
            ...output,
            timeToEvent: performance.now() - loadingStartTime,
          };
        })
      )
      .subscribe((statusOutput) => {
        onPanelStatusChange(statusOutput);
      });
    return () => subscription?.unsubscribe();

    // Panel status change subscription should only be run on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Select state from the embeddable
   */
  const loading = useSelectFromEmbeddableOutput('loading', embeddable);
  const viewMode = useSelectFromEmbeddableInput('viewMode', embeddable);

  /**
   * Render embeddable into ref, set up error subscription
   */
  useEffect(() => {
    if (!embeddableRoot.current) return;
    const nextNode = embeddable.render(embeddableRoot.current) ?? undefined;
    if (isPromise(nextNode)) {
      nextNode.then((resolved) => setNode(resolved));
    } else {
      setNode(nextNode);
    }
    const errorSubscription = embeddable.getOutput$().subscribe({
      next: (output) => {
        setOutputError(output.error);
      },
      error: (error) => setOutputError(error),
    });
    return () => {
      embeddable?.destroy();
      errorSubscription?.unsubscribe();
    };
  }, [embeddable, embeddableRoot]);

  const classes = useMemo(
    () =>
      classNames('embPanel', {
        'embPanel--editing': viewMode !== ViewMode.VIEW,
        'embPanel--loading': loading,
      }),
    [viewMode, loading]
  );

  const contentAttrs = useMemo(() => {
    const attrs: { [key: string]: boolean } = {};
    if (loading) attrs['data-loading'] = true;
    if (outputError) attrs['data-error'] = true;
    return attrs;
  }, [loading, outputError]);

  return (
    <EuiPanel
      role="figure"
      paddingSize="none"
      className={classes}
      hasShadow={showShadow}
      aria-labelledby={headerId}
      data-test-subj="embeddablePanel"
      data-test-embeddable-id={embeddable.id}
    >
      {!hideHeader && (
        <EmbeddablePanelHeader
          {...panelProps}
          headerId={headerId}
          universalActions={universalActions}
        />
      )}
      {outputError && (
        <EuiFlexGroup
          alignItems="center"
          className="eui-fullHeight embPanel__error"
          data-test-subj="embeddableError"
          justifyContent="center"
        >
          <EuiFlexItem>
            <EmbeddableErrorHandler embeddable={embeddable} error={outputError}>
              {(error) => (
                <EmbeddablePanelError
                  editPanelAction={universalActions.editPanel}
                  embeddable={embeddable}
                  error={error}
                />
              )}
            </EmbeddableErrorHandler>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <div className="embPanel__content" ref={embeddableRoot} {...contentAttrs}>
        {node}
      </div>
    </EuiPanel>
  );
};
