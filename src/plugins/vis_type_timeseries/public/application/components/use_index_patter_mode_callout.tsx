/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { EuiButton, EuiCallOut, EuiFlexGroup, EuiLink } from '@elastic/eui';
import { getCoreStart } from '../../services';

const LOCAL_STORAGE_KEY = 'TSVB_INDEX_PATTERN_CALLOUT_HIDDEN';

export const UseIndexPatternModeCallout = () => {
  const [dismissed, setDismissed] = useLocalStorage(LOCAL_STORAGE_KEY, false);
  const indexPatternModeLink = useMemo(
    () => getCoreStart().docLinks.links.visualize.tsvbIndexPatternMode,
    []
  );

  const dismissNotice = useCallback(() => {
    setDismissed(true);
  }, [setDismissed]);

  if (dismissed) {
    return null;
  }

  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="visTypeTimeseries.visEditorVisualization.indexPatternMode.notificationTitle"
          defaultMessage="TSVB now supports index patterns"
        />
      }
      iconType="cheer"
      size="s"
    >
      <p>
        <FormattedMessage
          id="visTypeTimeseries.visEditorVisualization.indexPatternMode.notificationMessage"
          defaultMessage="Great news! You can now visualize the data from Elasticsearch indices or Kibana index patterns. {indexPatternModeLink}."
          values={{
            indexPatternModeLink: (
              <EuiLink href={indexPatternModeLink} target="_blank" external>
                <FormattedMessage
                  id="visTypeTimeseries.visEditorVisualization.indexPatternMode.link"
                  defaultMessage="Check it out."
                />
              </EuiLink>
            ),
          }}
        />
      </p>
      <EuiFlexGroup gutterSize="none">
        <EuiButton size="s" onClick={dismissNotice}>
          <FormattedMessage
            id="visTypeTimeseries.visEditorVisualization.indexPatternMode.dismissNoticeButtonText"
            defaultMessage="Dismiss"
          />
        </EuiButton>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};
