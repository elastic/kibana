/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiComboBox,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  EuiTitle,
} from '@elastic/eui';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { playlistClient } from '../dashboard_client';
import type { DashboardPlaylist, DashboardPlaylistRequest } from '../../common/playlist';
import { DEFAULT_PLAYLIST_DURATION } from '../../common/playlist';
import { dashboardClient } from '../dashboard_client';
import { findService } from '../dashboard_client';
import { coreServices } from '../services/kibana_services';
import { getDashboardCapabilities } from '../utils/get_dashboard_capabilities';

const emptyRequest: DashboardPlaylistRequest = {
  name: '',
  dashboardIds: [],
  duration: DEFAULT_PLAYLIST_DURATION,
};

export const PlaylistListing = () => {
  const [playlists, setPlaylists] = useState<DashboardPlaylist[]>([]);
  const [editing, setEditing] = useState<DashboardPlaylistRequest & { id?: string }>();
  const [dashboardTitles, setDashboardTitles] = useState<Record<string, string>>({});
  const [dashboardOptions, setDashboardOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
    []
  );
  const [isDashboardSearchLoading, setIsDashboardSearchLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();
  const searchRequestId = useRef(0);
  const isEditing = editing !== undefined;
  const { showWriteControls } = getDashboardCapabilities();

  const refresh = useCallback(async () => {
    try {
      setPlaylists(await playlistClient.find());
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Unable to load playlists.');
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const searchDashboards = useCallback(async (query: string) => {
    const requestId = ++searchRequestId.current;
    setIsDashboardSearchLoading(true);
    try {
      const response = await dashboardClient.search({ query, per_page: 20 });
      if (requestId !== searchRequestId.current) return;
      setDashboardOptions(
        response.data.map(({ id, data }) => ({
          value: id,
          label: data.title,
        }))
      );
    } catch (searchError) {
      if (requestId === searchRequestId.current) {
        setError(
          searchError instanceof Error ? searchError.message : 'Unable to search dashboards.'
        );
      }
    } finally {
      if (requestId === searchRequestId.current) setIsDashboardSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isEditing) void searchDashboards('');
  }, [isEditing, searchDashboards]);

  const save = async () => {
    if (!editing?.name.trim() || editing.dashboardIds.length === 0 || editing.duration <= 0) return;
    setIsSaving(true);
    setError(undefined);
    const request: DashboardPlaylistRequest = {
      name: editing.name,
      dashboardIds: editing.dashboardIds,
      duration: editing.duration,
    };
    try {
      if (editing.id) await playlistClient.update(editing.id, request);
      else await playlistClient.create(request);
      setEditing(undefined);
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save playlist.');
    } finally {
      setIsSaving(false);
    }
  };

  const editPlaylist = async (playlist: DashboardPlaylist) => {
    setEditing(playlist);
    const results = await findService.findByIds(playlist.dashboardIds);
    setDashboardTitles((titles) => ({
      ...titles,
      ...results.reduce<Record<string, string>>((nextTitles, result) => {
        if (result.status === 'success') nextTitles[result.id] = result.attributes.title;
        return nextTitles;
      }, {}),
    }));
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2>Playlists</h2>
            </EuiTitle>
          </EuiFlexItem>
          {showWriteControls && (
            <EuiFlexItem grow={false}>
              <EuiButton iconType="plusCircle" onClick={() => setEditing(emptyRequest)}>
                Create playlist
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      {error && (
        <EuiFlexItem>
          <KbnDangerCallout announceOnMount title="Playlist error">
            {error}
          </KbnDangerCallout>
        </EuiFlexItem>
      )}
      {editing && (
        <EuiFlexItem>
          <EuiPanel hasBorder>
            <EuiTitle size="s">
              <h3>{editing.id ? 'Edit playlist' : 'Create playlist'}</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiForm
              component="form"
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              <EuiFormRow label="Name" fullWidth>
                <EuiFieldText
                  value={editing.name}
                  onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                />
              </EuiFormRow>
              <EuiFormRow
                label="Rotation duration (seconds)"
                helpText="Must be greater than zero."
                fullWidth
              >
                <EuiFieldNumber
                  min={1}
                  value={editing.duration / 1000}
                  onChange={(event) =>
                    setEditing({ ...editing, duration: Number(event.target.value) * 1000 })
                  }
                />
              </EuiFormRow>
              <EuiFormRow
                label="Find dashboards"
                helpText="Select dashboards, then arrange their playback order below."
                fullWidth
              >
                <EuiComboBox<string>
                  aria-label="Find dashboards"
                  fullWidth
                  isClearable
                  isLoading={isDashboardSearchLoading}
                  placeholder="Search dashboards"
                  options={dashboardOptions.filter(
                    (option) => !editing.dashboardIds.includes(option.value ?? '')
                  )}
                  selectedOptions={editing.dashboardIds.map((id) => ({
                    value: id,
                    label: dashboardTitles[id] ?? id,
                  }))}
                  onSearchChange={(query) => void searchDashboards(query)}
                  onChange={(options) => {
                    const dashboardIds = options.flatMap((option) =>
                      option.value ? [option.value] : []
                    );
                    setDashboardTitles({
                      ...dashboardTitles,
                      ...options.reduce<Record<string, string>>((titles, option) => {
                        if (option.value) titles[option.value] = option.label;
                        return titles;
                      }, {}),
                    });
                    setEditing({ ...editing, dashboardIds });
                  }}
                />
              </EuiFormRow>
              <EuiFormRow
                label="Playlist order"
                helpText="Dashboards play from top to bottom."
                fullWidth
              >
                <EuiPanel color="subdued" paddingSize="s">
                  {editing.dashboardIds.length > 0 ? (
                    <EuiText size="s">
                      <ol>
                        {editing.dashboardIds.map((id, index) => (
                          <li key={id}>
                            {dashboardTitles[id] ?? id}{' '}
                            <EuiToolTip content="Move dashboard up" disableScreenReaderOutput>
                              <EuiButtonIcon
                                iconType="sortUp"
                                aria-label="Move dashboard up"
                                disabled={index === 0}
                                onClick={() =>
                                  setEditing({
                                    ...editing,
                                    dashboardIds: move(editing.dashboardIds, index, -1),
                                  })
                                }
                              />
                            </EuiToolTip>
                            <EuiToolTip content="Move dashboard down" disableScreenReaderOutput>
                              <EuiButtonIcon
                                iconType="sortDown"
                                aria-label="Move dashboard down"
                                disabled={index === editing.dashboardIds.length - 1}
                                onClick={() =>
                                  setEditing({
                                    ...editing,
                                    dashboardIds: move(editing.dashboardIds, index, 1),
                                  })
                                }
                              />
                            </EuiToolTip>
                            <EuiToolTip content="Remove dashboard" disableScreenReaderOutput>
                              <EuiButtonIcon
                                iconType="cross"
                                aria-label="Remove dashboard"
                                onClick={() =>
                                  setEditing({
                                    ...editing,
                                    dashboardIds: editing.dashboardIds.filter(
                                      (dashboardId) => dashboardId !== id
                                    ),
                                  })
                                }
                              />
                            </EuiToolTip>
                          </li>
                        ))}
                      </ol>
                    </EuiText>
                  ) : (
                    <EuiText color="subdued" size="s">
                      Select dashboards above to build the playlist order.
                    </EuiText>
                  )}
                </EuiPanel>
              </EuiFormRow>
              <EuiSpacer size="m" />
              <EuiButton
                fill
                iconType="save"
                type="submit"
                isLoading={isSaving}
                disabled={
                  isSaving ||
                  !editing.name.trim() ||
                  editing.dashboardIds.length === 0 ||
                  editing.duration <= 0
                }
              >
                Save
              </EuiButton>{' '}
              <EuiButton onClick={() => setEditing(undefined)}>Cancel</EuiButton>
            </EuiForm>
          </EuiPanel>
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        {playlists.length === 0 && !editing && <EuiText>No playlists yet.</EuiText>}
        {playlists.map((playlist) => (
          <React.Fragment key={playlist.id}>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem>
                <EuiText>
                  <strong>{playlist.name}</strong> ({playlist.dashboardIds.length} dashboards)
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  onClick={() =>
                    coreServices.application.navigateToApp('dashboards', {
                      path: `#/playlist/${playlist.id}`,
                    })
                  }
                >
                  Start
                </EuiButton>
              </EuiFlexItem>
              {showWriteControls && (
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={`Edit ${playlist.name}`} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="pencil"
                      aria-label={`Edit ${playlist.name}`}
                      onClick={() => void editPlaylist(playlist)}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              )}
              {showWriteControls && (
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={`Delete ${playlist.name}`} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="trash"
                      aria-label={`Delete ${playlist.name}`}
                      color="danger"
                      onClick={() =>
                        void playlistClient
                          .delete(playlist.id)
                          .then(refresh)
                          .catch((deleteError) => {
                            setError(
                              deleteError instanceof Error
                                ? deleteError.message
                                : 'Unable to delete playlist.'
                            );
                          })
                      }
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            <EuiHorizontalRule margin="s" />
          </React.Fragment>
        ))}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const move = (items: string[], index: number, direction: -1 | 1) => {
  const next = [...items];
  [next[index], next[index + direction]] = [next[index + direction], next[index]];
  return next;
};
