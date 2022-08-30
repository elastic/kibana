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
import { FormattedMessage } from '@kbn/i18n-react';
import { VIEW_MODE } from './constants';
import './_index.scss';

export const DocumentViewModeToggle = ({
  viewMode,
  setDiscoverViewMode,
}: {
  viewMode: VIEW_MODE;
  setDiscoverViewMode: (viewMode: VIEW_MODE) => void;
}) => {
  const toggleButtons = useMemo(
    () => [
      {
        id: VIEW_MODE.DOCUMENT_LEVEL,
        label: i18n.translate('discover.viewModes.document.label', {
          defaultMessage: 'Documents',
        }),
        'data-test-subj': 'dscViewModeDocumentButton',
      },
      {
        id: VIEW_MODE.AGGREGATED_LEVEL,
        label: (
          <div className="fieldStatsButton" data-test-subj="dscViewModeFieldStatsButton">
            <FormattedMessage
              id="discover.viewModes.fieldStatistics.label"
              defaultMessage="Field statistics"
            />
            <EuiBetaBadge
              label={i18n.translate('discover.viewModes.fieldStatistics.betaTitle', {
                defaultMessage: 'Beta',
              })}
              size="s"
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
      idSelected={viewMode}
      onChange={(id: string) => setDiscoverViewMode(id as VIEW_MODE)}
      data-test-subj={'dscViewModeToggle'}
    />
  );
};
