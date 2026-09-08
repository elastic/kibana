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
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import React, { useEffect, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { DashboardPlaylist } from '../../common/playlist';
import {
  playlistClient,
  createPlaylistPlaybackController,
  type PlaylistPlaybackController,
  type PlaylistPlaybackState,
} from '../dashboard_client';
import { findService } from '../dashboard_client';

export const PlaylistRunner = () => {
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const location = useLocation();
  const playlistId =
    location.pathname.match(/^\/playlist\/([^/]+)$/)?.[1] ??
    new URLSearchParams(location.search).get('playlistId') ??
    undefined;
  const [activePlaylistId, setActivePlaylistId] = useState<string>();
  const [playlist, setPlaylist] = useState<DashboardPlaylist>();
  const [loadError, setLoadError] = useState<string>();
  const [playback, setPlayback] = useState<PlaylistPlaybackState>({
    index: 0,
    isPlaying: false,
    unavailable: [],
  });
  const controller = useRef<PlaylistPlaybackController>();

  useEffect(() => {
    if (playlistId) setActivePlaylistId(playlistId);
    else setActivePlaylistId(undefined);
  }, [location.pathname, playlistId]);

  useEffect(() => {
    if (!activePlaylistId) return;
    let canceled = false;
    let removeVisibilityListener: (() => void) | undefined;
    setLoadError(undefined);
    playlistClient
      .get(activePlaylistId)
      .then((loadedPlaylist) => {
        if (canceled) return;
        setPlaylist(loadedPlaylist);
        const nextController = createPlaylistPlaybackController({
          playlist: loadedPlaylist,
          onNavigate: async (dashboardId) => {
            const result = await findService.findById(dashboardId);
            if (canceled) return false;
            if (result.status !== 'success') {
              throw result.error;
            }
            history.push(
              `/view/${dashboardId}?playlistId=${encodeURIComponent(loadedPlaylist.id)}`
            );
            return true;
          },
        });
        controller.current = nextController;
        nextController.subscribe(setPlayback);
        void nextController.start();

        let resumedAfterVisibilityChange = false;
        const onVisibilityChange = () => {
          if (document.hidden) {
            resumedAfterVisibilityChange = nextController.getState().isPlaying;
            if (resumedAfterVisibilityChange) nextController.pause();
          } else if (resumedAfterVisibilityChange) {
            resumedAfterVisibilityChange = false;
            void nextController.resume();
          }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        removeVisibilityListener = () =>
          document.removeEventListener('visibilitychange', onVisibilityChange);
        nextController.subscribe(() => {
          if (!nextController.getState().isPlaying) resumedAfterVisibilityChange = false;
        });
      })
      .catch((error) => {
        if (canceled) return;
        setLoadError(error instanceof Error ? error.message : 'Unable to load playlist.');
      });
    return () => {
      canceled = true;
      removeVisibilityListener?.();
      controller.current?.stop();
      controller.current = undefined;
    };
  }, [activePlaylistId, history]);

  if (!activePlaylistId) return null;
  if (loadError) {
    return (
      <EuiPanel
        paddingSize="m"
        style={{
          position: 'fixed',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: euiTheme.levels.toast,
        }}
      >
        <KbnDangerCallout announceOnMount title="Playlist unavailable">
          {loadError}
        </KbnDangerCallout>
        <EuiSpacer size="s" />
        <EuiButton iconType="logOut" onClick={() => history.push('/list/playlists')}>
          Exit
        </EuiButton>
      </EuiPanel>
    );
  }
  if (!playlist || !controller.current) return null;
  const current = playback.index + 1;
  return (
    <EuiPanel
      paddingSize="s"
      color="subdued"
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: euiTheme.levels.toast,
      }}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        {playback.error && (
          <EuiFlexItem grow={false}>
            <KbnDangerCallout announceOnMount title="Playback stopped">
              {playback.error}
            </KbnDangerCallout>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiToolTip content="Previous dashboard" disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="sortLeft"
              aria-label="Previous dashboard"
              onClick={() => void controller.current?.previous()}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType={playback.isPlaying ? 'pause' : 'play'}
            onClick={() =>
              playback.isPlaying ? controller.current?.pause() : void controller.current?.resume()
            }
          >
            {playback.isPlaying ? 'Pause' : 'Resume'}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content="Next dashboard" disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="sortRight"
              aria-label="Next dashboard"
              onClick={() => void controller.current?.next()}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            {current} / {playlist.dashboardIds.length}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSpacer size="xs" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton iconType="logOut" onClick={() => history.push('/list/playlists')}>
            Exit
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
