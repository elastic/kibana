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
import { LazyRequestsViewComponent } from '../views/requests';
import type { InspectorSnapshot, InspectorSnapshotMeta } from '../snapshot/snapshot';
import type { SnapshotKibanaInfo } from '../snapshot/environment';
import { getBrowserInfo, getSpaceId } from '../snapshot/environment';
import {
  createRequestAdapter,
  decodeSnapshot,
  downloadSnapshot,
  serializeAdapters,
} from '../snapshot/snapshot';
import {
  SnapshotCallout,
  SnapshotPanel,
  SnapshotReplayNotice,
} from '../snapshot/snapshot_controls';
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

/** Pseudo view listed in the view chooser; its content is rendered by the panel itself. */
const snapshotView: InspectorViewDescription = {
  title: 'Import / Export',
  help: 'Export the requests to a snapshot file or import a previously exported snapshot.',
  component: () => null,
};

interface InspectorPanelProps {
  adapters: Adapters;
  title?: string;
  options?: unknown;
  views: InspectorViewDescription[];
  dependencies: InspectorKibanaServices;
  snapshot?: InspectorSnapshotOptions;
  kibanaBuild?: SnapshotKibanaInfo;
}

interface InspectorPanelState {
  selectedView: InspectorViewDescription;
  views: InspectorViewDescription[];
  adapters: Adapters;
  imported?: { snapshot: InspectorSnapshot; adapters: Adapters };
  snapshotError?: string;
  isSnapshotViewSelected: boolean;
}

export class InspectorPanel extends Component<InspectorPanelProps, InspectorPanelState> {
  static defaultProps = {
    title: inspectorTitle,
  };

  // Ignores the result of an import that finished after a newer one was started
  private latestImport = 0;

  state: InspectorPanelState = {
    selectedView: this.props.views[0],
    views: this.props.views,
    // Clone adapters array so we can validate that this prop never change
    adapters: { ...this.props.adapters },
    isSnapshotViewSelected: false,
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
    if (view === snapshotView) {
      this.setState({ isSnapshotViewSelected: true });
      return;
    }
    this.setState((prev) => ({
      selectedView: view,
      isSnapshotViewSelected: false,
      snapshotError: undefined,
      // An imported snapshot only has requests, so switching to another view leaves it.
      imported: view === prev.selectedView ? prev.imported : undefined,
    }));
  };

  exportSnapshot = async (gzip: boolean) => {
    this.setState({ snapshotError: undefined });
    try {
      await this.downloadCurrentSnapshot(gzip);
    } catch (e) {
      this.setState({ snapshotError: `Could not export snapshot: ${e.message}` });
    }
  };

  /** Metadata describing the current session, stored on export and compared on import. */
  getCurrentMeta = (): InspectorSnapshotMeta => {
    const { title, snapshot, kibanaBuild, dependencies } = this.props;
    const timezone = dependencies.uiSettings?.get?.<string>('dateFormat:tz');
    const basePath = dependencies.http?.basePath;
    return {
      kibanaVersion: kibanaBuild?.version ?? '',
      createdAt: new Date().toISOString(),
      appId: snapshot?.appId,
      title,
      timezone:
        timezone === 'Browser' ? Intl.DateTimeFormat().resolvedOptions().timeZone : timezone,
      kibana: kibanaBuild,
      browser: getBrowserInfo(),
      locale: i18n.getLocale(),
      spaceId: basePath ? getSpaceId(basePath.get(), basePath.serverBasePath) : undefined,
      origin: window.location.origin,
      restoredFrom: snapshot?.replay
        ? {
            createdAt: snapshot.replay.createdAt,
            kibanaVersion: snapshot.replay.kibanaVersion,
          }
        : undefined,
    };
  };

  downloadCurrentSnapshot = async (gzip: boolean) => {
    const { adapters, snapshot } = this.props;
    const meta = this.getCurrentMeta();
    const app = snapshot ? { id: snapshot.appId, state: await snapshot.getAppState() } : undefined;
    await downloadSnapshot(serializeAdapters(adapters, meta, app), gzip);
  };

  importSnapshot = async (file: File) => {
    const importId = ++this.latestImport;
    try {
      const snapshot = await decodeSnapshot(file);
      if (importId !== this.latestImport) {
        return;
      }
      const requests = createRequestAdapter(Object.values(snapshot.requests).flat());
      const requestsView = this.props.views.find(
        (view) => view.component === LazyRequestsViewComponent
      );
      this.setState((prev) => ({
        imported: { snapshot, adapters: { requests } },
        snapshotError: undefined,
        isSnapshotViewSelected: false,
        selectedView: requestsView ?? prev.selectedView,
      }));
    } catch (e) {
      if (importId !== this.latestImport) {
        return;
      }
      this.setState({
        imported: undefined,
        snapshotError: `Could not import snapshot: ${e.message}`,
      });
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
          currentMeta={this.getCurrentMeta()}
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
    const replay = this.props.snapshot?.replay;
    if (this.state.isSnapshotViewSelected) {
      return (
        <SnapshotPanel
          onExport={this.exportSnapshot}
          onImport={this.importSnapshot}
          hasImportedSnapshot={Boolean(this.state.imported)}
          isReplaying={Boolean(replay)}
        />
      );
    }
    if (this.state.imported) {
      return this.renderImportedSnapshot();
    }
    return (
      <Suspense fallback={<EuiLoadingSpinner />}>
        {replay && <SnapshotReplayNotice meta={replay} currentMeta={this.getCurrentMeta()} />}
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
    const { selectedView, isSnapshotViewSelected } = this.state;

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
              <InspectorViewChooser
                views={this.props.adapters.requests ? [...views, snapshotView] : views}
                onViewSelected={this.onViewSelected}
                selectedView={isSnapshotViewSelected ? snapshotView : selectedView}
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
          {this.state.snapshotError && (
            <>
              <EuiCallOut
                announceOnMount
                size="s"
                color="danger"
                iconType="error"
                title={this.state.snapshotError}
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
