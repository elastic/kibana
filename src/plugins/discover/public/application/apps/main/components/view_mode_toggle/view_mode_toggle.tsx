/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButtonGroup, EuiBetaBadge } from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { DISCOVER_VIEW_MODE } from './constants';
import './_index.scss';

export const DocumentViewModeToggle = ({
  discoverViewMode,
  setDiscoverViewMode,
}: {
  discoverViewMode: DISCOVER_VIEW_MODE;
  setDiscoverViewMode: (discoverViewMode: DISCOVER_VIEW_MODE) => void;
}) => {
  const toggleButtons = useMemo(
    () => [
      {
        id: DISCOVER_VIEW_MODE.DOCUMENT_LEVEL,
        label: i18n.translate('discover.viewModes.document.label', {
          defaultMessage: 'Documents',
        }),
      },
      {
        id: DISCOVER_VIEW_MODE.FIELD_LEVEL,
        label: (
          <div className="fieldStatsButton">
            <FormattedMessage
              id="discover.viewModes.fieldStatistics.label"
              defaultMessage="Field Statistics"
            />
            <EuiBetaBadge
              label={i18n.translate('discover.viewModes.fieldStatistics.betaTitle', {
                defaultMessage: 'Beta',
              })}
              size="s"
              iconType="beaker"
              className="fieldStatsBetaBadge"
            />
          </div>
        ),
      },
    ],
    []
  );

  return (
    <EuiButtonGroup
      className={'dscViewModeToggle'}
      legend={i18n.translate('discover.viewModes.legend', { defaultMessage: 'View modes' })}
      buttonSize={'compressed'}
      options={toggleButtons}
      idSelected={discoverViewMode}
      onChange={(id: string) => setDiscoverViewMode(id as DISCOVER_VIEW_MODE)}
    />
  );
};
