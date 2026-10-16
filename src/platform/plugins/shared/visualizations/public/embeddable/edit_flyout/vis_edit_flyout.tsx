/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  EmbeddableRenderer,
  PanelEditFlyout,
  type PanelSettingsApi,
} from '@kbn/embeddable-plugin/public';
import { apiPublishesUnifiedSearch } from '@kbn/presentation-publishing';
import { VISUALIZE_EMBEDDABLE_TYPE } from '@kbn/visualizations-common';
import { getTimeFilter } from '../../services';
import type { VisualizeEmbeddableState } from '../../../common/embeddable/types';

const VisPreview = ({
  state,
  parentApi,
}: {
  state: VisualizeEmbeddableState;
  parentApi: unknown;
}) => {
  const getParentApi = useCallback(
    () => ({
      getSerializedStateForChild: () => state,
      // the preview is read-only, so it should not trigger filters or other actions
      disableTriggers: true,
      // render with the same filters, query and time range as the panel
      ...(apiPublishesUnifiedSearch(parentApi)
        ? {
            filters$: parentApi.filters$,
            query$: parentApi.query$,
            timeRange$: parentApi.timeRange$,
          }
        : {}),
    }),
    [parentApi, state]
  );

  return (
    <div css={styles.preview} data-test-subj="visEditFlyoutPreview">
      <EmbeddableRenderer
        type={VISUALIZE_EMBEDDABLE_TYPE}
        getParentApi={getParentApi}
        hidePanelChrome
      />
    </div>
  );
};

export interface VisEditFlyoutProps {
  api: PanelSettingsApi;
  parentApi: unknown;
  getState: () => VisualizeEmbeddableState;
  /** Display name of the vis type, used for the link to its editor (e.g. "Vega") */
  visTypeTitle: string;
  /** Opens the visualization in its editor. Not provided when the user can't edit it. */
  navigateToEditor?: () => Promise<void>;
  closeFlyout: () => void;
  ariaLabelledBy: string;
}

export const VisEditFlyout = ({
  api,
  parentApi,
  getState,
  visTypeTitle,
  navigateToEditor,
  closeFlyout,
  ariaLabelledBy,
}: VisEditFlyoutProps) => {
  const [initialState] = useState(getState);
  const globalTimeRange = useMemo(() => getTimeFilter().getTime(), []);

  return (
    <PanelEditFlyout
      api={api}
      title={i18n.translate('visualizations.editFlyout.title', {
        defaultMessage: 'Edit {visTypeTitle} visualization',
        values: { visTypeTitle },
      })}
      preview={<VisPreview state={initialState} parentApi={parentApi} />}
      editorLinkLabel={i18n.translate('visualizations.editFlyout.editInEditorLabel', {
        defaultMessage: 'Edit in {visTypeTitle}',
        values: { visTypeTitle },
      })}
      onNavigateToEditor={navigateToEditor}
      fallbackTimeRange={globalTimeRange}
      closeFlyout={closeFlyout}
      ariaLabelledBy={ariaLabelledBy}
    />
  );
};

const styles = {
  preview: css({
    display: 'flex',
    flex: 1,
    minInlineSize: 0,
    '& > *': { flex: 1, minInlineSize: 0 },
  }),
};
