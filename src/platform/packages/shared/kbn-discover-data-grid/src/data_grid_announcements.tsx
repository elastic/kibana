/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { EuiLiveAnnouncer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { DataGridCommandFailureReason } from './data_grid_api';

interface DataGridAnnouncements {
  readonly liveRegion: React.ReactElement;
  readonly announceCopySuccess: () => void;
  readonly announceCopyFailure: () => void;
  readonly announceCommandFailure: (reason: DataGridCommandFailureReason) => void;
  readonly announceRowsBecameEmpty: () => void;
}

interface AnnouncementEvent {
  readonly id: number;
  readonly message: string;
}

export const useDataGridAnnouncements = (): DataGridAnnouncements => {
  const [announcement, setAnnouncement] = useState<AnnouncementEvent>();
  const announce = useCallback((message: string) => {
    setAnnouncement((previous) => ({ id: (previous?.id ?? 0) + 1, message }));
  }, []);
  const announceCopySuccess = useCallback(() => {
    announce(
      i18n.translate('discoverDataGrid.accessibility.copySuccessDetail', {
        defaultMessage: 'Cell value copied.',
      })
    );
  }, [announce]);
  const announceCopyFailure = useCallback(() => {
    announce(
      i18n.translate('discoverDataGrid.accessibility.copyFailureErrorMessage', {
        defaultMessage: 'Cell value could not be copied.',
      })
    );
  }, [announce]);
  const announceCommandFailure = useCallback(
    (reason: DataGridCommandFailureReason) => {
      switch (reason) {
        case 'row_not_found':
          announce(
            i18n.translate('discoverDataGrid.accessibility.missingRowErrorMessage', {
              defaultMessage: 'Could not find the requested grid row.',
            })
          );
          break;
        case 'column_not_found':
          announce(
            i18n.translate('discoverDataGrid.accessibility.missingColumnErrorMessage', {
              defaultMessage: 'Could not find the requested grid column.',
            })
          );
          break;
        case 'scroll_failed':
          announce(
            i18n.translate('discoverDataGrid.accessibility.scrollFailureErrorMessage', {
              defaultMessage: 'Could not move to the requested grid cell.',
            })
          );
          break;
      }
    },
    [announce]
  );
  const announceRowsBecameEmpty = useCallback(() => {
    announce(
      i18n.translate('discoverDataGrid.accessibility.noRowsDescription', {
        defaultMessage: 'No rows remain in the grid.',
      })
    );
  }, [announce]);

  return {
    liveRegion: (
      <EuiLiveAnnouncer role="status" aria-live="polite">
        {announcement ? <span key={announcement.id}>{announcement.message}</span> : null}
      </EuiLiveAnnouncer>
    ),
    announceCopySuccess,
    announceCopyFailure,
    announceCommandFailure,
    announceRowsBecameEmpty,
  };
};
