/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { EuiTextColor, EuiButton, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { getCoreStart } from '../../../../services';
import type { IndexPatternObject } from '../../../../../common/types';

interface LegacyModePopoverProps {
  switchMode: () => void;
  value: string;
  matchedIndex?: IndexPatternObject;
}

const getReadyToMigrateCallOut = (
  value: LegacyModePopoverProps['value'],
  onModeChange: LegacyModePopoverProps['switchMode']
) => (
  <EuiCallOut
    title={i18n.translate('visTypeTimeseries.indexPatternSelect.readyToMigrateCallOut.title', {
      defaultMessage: 'You are ready for switching mode.',
    })}
    color="success"
    iconType="cheer"
    size="s"
  >
    <FormattedMessage
      id="visTypeTimeseries.indexPatternSelect.readyToMigrateCallOut.text"
      defaultMessage="We found that you have already have '{index}' index on your instance."
      values={{
        index: <EuiTextColor color="secondary">{value}</EuiTextColor>,
      }}
    />
    <EuiButton fullWidth={true} iconType="gear" size="s" onClick={onModeChange}>
      <FormattedMessage
        id="visTypeTimeseries.indexPatternSelect.useKibanaIndex.label"
        defaultMessage="Use Kibana index"
      />
    </EuiButton>
  </EuiCallOut>
);

const getNoMatchedIndicesCallOut = (
  value: LegacyModePopoverProps['value'],
  onCreateIndexClick: () => void
) => (
  <EuiCallOut
    title={i18n.translate('visTypeTimeseries.indexPatternSelect.noMatchedIndicesCallOut.title', {
      defaultMessage: "Input index doesn't match any Kibana indices.",
    })}
    color="primary"
    iconType="faceSad"
    size="s"
  >
    <FormattedMessage
      id="visTypeTimeseries.indexPatternSelect.noMatchedIndicesCallOut.text"
      defaultMessage="Before switching mode you should create a Kibana index pattern for '{index}'."
      values={{
        index: <EuiTextColor color="secondary">{value}</EuiTextColor>,
      }}
    />
    <EuiButton fullWidth={true} iconType="plusInCircle" size="s" onClick={onCreateIndexClick}>
      <FormattedMessage
        id="visTypeTimeseries.indexPatternSelect.noMatchedIndicesCallOut.create index"
        defaultMessage="Create index pattern"
      />
    </EuiButton>
  </EuiCallOut>
);

export const MigrationCallout = ({ value, switchMode, matchedIndex }: LegacyModePopoverProps) => {
  const navigateToCreateIndexPatterns = useCallback(() => {
    getCoreStart().application.navigateToApp('management', {
      path: `/kibana/indexPatterns/create?name=${value}`,
    });
  }, [value]);

  return (
    <>
      <EuiSpacer />
      {matchedIndex && getReadyToMigrateCallOut(value, switchMode)}
      {!matchedIndex && getNoMatchedIndicesCallOut(value, navigateToCreateIndexPatterns)}
    </>
  );
};
