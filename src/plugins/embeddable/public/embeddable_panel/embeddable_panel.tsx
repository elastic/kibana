/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import classNames from 'classnames';
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
  useSelectFromEmbeddableInput,
  useSelectFromEmbeddableOutput,
} from './use_select_from_embeddable';
import { ViewMode, EmbeddableErrorHandler } from '../lib';
import { EmbeddablePanelError } from './embeddable_panel_error';
import { core, embeddableStart, inspector } from '../kibana_services';
import { UnwrappedEmbeddablePanelProps, PanelUniversalActions } from './types';
import { EmbeddablePanelHeader } from './panel_header/embeddable_panel_header';

export const EmbeddablePanel = (panelProps: UnwrappedEmbeddablePanelProps) => {
  const [node, setNode] = useState<ReactNode | undefined>();
  const { hideHeader, showShadow, embeddable, containerContext, hideInspector } = panelProps;
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

    const actions: PanelUniversalActions = {
      customizePanel: new CustomizePanelAction(
        core.overlays,
        core.theme,
        commonlyUsedRanges,
        dateFormat
      ),
      removePanel: new RemovePanelAction(),
      editPanel: new EditPanelAction(
        embeddableStart.getEmbeddableFactory,
        core.application,
        stateTransfer,
        containerContext?.getCurrentPath
      ),
    };
    if (!hideInspector) actions.inspectPanel = new InspectPanelAction(inspector);
    return actions;
  }, [containerContext?.getCurrentPath, hideInspector]);

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
