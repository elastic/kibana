/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import React, { Component, Suspense } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiLoadingSpinner,
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { css } from '@emotion/react';
import type { InspectorSnapshotOptions, InspectorViewDescription } from '../types';
import type { Adapters } from '../../common';
import { RequestsViewComponent } from '../views/requests/components/requests_view';
import type { InspectorSnapshot } from '../snapshot/snapshot';
import {
  createRequestAdapter,
  decodeSnapshot,
  downloadSnapshot,
  serializeAdapters,
} from '../snapshot/snapshot';
import { SnapshotCallout, SnapshotControls } from '../snapshot/snapshot_controls';
import type { InspectorKibanaServices } from '../views/requests/components/types';
import { InspectorViewChooser } from './inspector_view_chooser';

function hasAdaptersChanged(oldAdapters: Adapters, newAdapters: Adapters) {
  return (
    Object.keys(oldAdapters).length !== Object.keys(newAdapters).length ||
    Object.keys(oldAdapters).some((key) => oldAdapters[key] !== newAdapters[key])
  );
}

const inspectorTitle = i18n.translate('inspector.title', {
  defaultMessage: 'Inspector',
});

interface InspectorPanelProps {
  adapters: Adapters;
  title?: string;
  options?: unknown;
  views: InspectorViewDescription[];
  dependencies: InspectorKibanaServices;
  snapshot?: InspectorSnapshotOptions;
  kibanaVersion?: string;
}

interface InspectorPanelState {
  selectedView: InspectorViewDescription;
  views: InspectorViewDescription[];
  adapters: Adapters;
  imported?: { snapshot: InspectorSnapshot; adapters: Adapters };
  importError?: string;
}

export class InspectorPanel extends Component<InspectorPanelProps, InspectorPanelState> {
  static defaultProps = {
    title: inspectorTitle,
  };

  state: InspectorPanelState = {
    selectedView: this.props.views[0],
    views: this.props.views,
    // Clone adapters array so we can validate that this prop never change
    adapters: { ...this.props.adapters },
  };

  static getDerivedStateFromProps(nextProps: InspectorPanelProps, prevState: InspectorPanelState) {
    if (hasAdaptersChanged(prevState.adapters, nextProps.adapters)) {
      throw new Error('Adapters are not allowed to be changed on an open InspectorPanel.');
    }
    const selectedViewMustChange =
      nextProps.views !== prevState.views && !nextProps.views.includes(prevState.selectedView);
    return {
      views: nextProps.views,
      selectedView: selectedViewMustChange ? nextProps.views[0] : prevState.selectedView,
    };
  }

  onViewSelected = (view: InspectorViewDescription) => {
    if (view !== this.state.selectedView) {
      this.setState({
        selectedView: view,
      });
    }
  };

  exportSnapshot = async (gzip: boolean) => {
    const { adapters, title, snapshot, kibanaVersion = '', dependencies } = this.props;
    const timezone = dependencies.uiSettings.get<string>('dateFormat:tz');
    const meta = {
      kibanaVersion,
      createdAt: new Date().toISOString(),
      appId: snapshot?.appId,
      title,
      timezone:
        timezone === 'Browser' ? Intl.DateTimeFormat().resolvedOptions().timeZone : timezone,
    };
    const app = snapshot ? { id: snapshot.appId, state: await snapshot.getAppState() } : undefined;
    await downloadSnapshot(serializeAdapters(adapters, meta, app), gzip);
  };

  importSnapshot = async (file: File) => {
    try {
      const snapshot = await decodeSnapshot(file);
      const requests = createRequestAdapter(Object.values(snapshot.requests).flat());
      this.setState({ imported: { snapshot, adapters: { requests } }, importError: undefined });
    } catch (e) {
      this.setState({ imported: undefined, importError: e.message });
    }
  };

  renderImportedSnapshot() {
    const { imported } = this.state;
    const { snapshot, title } = this.props;
    if (!imported) {
      return null;
    }
    const { restore, appId } = snapshot ?? {};
    return (
      <>
        <SnapshotCallout
          snapshot={imported.snapshot}
          canRestore={Boolean(restore) && imported.snapshot.app?.id === appId}
          onRestore={async () => restore?.(imported.snapshot)}
          onClose={() => this.setState({ imported: undefined })}
        />
        <Suspense fallback={<EuiLoadingSpinner />}>
          <RequestsViewComponent
            adapters={imported.adapters}
            title={imported.snapshot.meta.title || title || ''}
          />
        </Suspense>
      </>
    );
  }

  renderSelectedPanel() {
    if (this.state.imported) {
      return this.renderImportedSnapshot();
    }
    return (
      <Suspense fallback={<EuiLoadingSpinner />}>
        <this.state.selectedView.component
          adapters={this.props.adapters}
          title={this.props.title || ''}
          options={this.props.options}
        />
      </Suspense>
    );
  }

  render() {
    const { views, title, dependencies } = this.props;
    const { selectedView } = this.state;

    return (
      <KibanaContextProvider services={dependencies}>
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={true}>
              <EuiTitle size="s">
                <h1 id="inspector-panel-title">{title}</h1>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <SnapshotControls onExport={this.exportSnapshot} onImport={this.importSnapshot} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <InspectorViewChooser
                views={views}
                onViewSelected={this.onViewSelected}
                selectedView={selectedView}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody
          css={css({
            '.euiFlyoutBody__overflowContent': {
              height: '100%',
              display: 'flex',
              flexWrap: 'nowrap',
              flexDirection: 'column',

              '> div': {
                flexGrow: 0,
              },

              '.insRequestCodeViewer': {
                flexGrow: 1,
              },
            },
          })}
        >
          {this.state.importError && (
            <>
              <EuiCallOut
                announceOnMount
                size="s"
                color="danger"
                iconType="error"
                title={`Could not import snapshot: ${this.state.importError}`}
              />
              <EuiSpacer size="s" />
            </>
          )}
          {this.renderSelectedPanel()}
        </EuiFlyoutBody>
      </KibanaContextProvider>
    );
  }
}
