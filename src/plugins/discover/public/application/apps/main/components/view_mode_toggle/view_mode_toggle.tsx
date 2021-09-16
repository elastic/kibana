/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButtonGroup } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { DISCOVER_VIEW_MODE } from './constants';

const toggleButtons = [
  {
    id: DISCOVER_VIEW_MODE.DOCUMENT_LEVEL,
    label: 'Documents',
  },
  {
    id: DISCOVER_VIEW_MODE.FIELD_LEVEL,
    label: 'Field Statistics',
  },
];

export const DocumentViewModeToggle = ({
  discoverViewMode,
  setDiscoverViewMode,
}: {
  discoverViewMode: DISCOVER_VIEW_MODE;
  setDiscoverViewMode: (discoverViewMode: DISCOVER_VIEW_MODE) => void;
}) => {
  return (
    <EuiButtonGroup
      legend={i18n.translate('discover.viewModes.legend', { defaultMessage: 'View modes' })}
      style={{ paddingRight: 16 }}
      buttonSize={'compressed'}
      options={toggleButtons}
      idSelected={discoverViewMode}
      onChange={(id: string) => setDiscoverViewMode(id as DISCOVER_VIEW_MODE)}
    />
  );
};
