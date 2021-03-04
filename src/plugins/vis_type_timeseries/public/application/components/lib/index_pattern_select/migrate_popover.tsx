/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiTextColor,
  EuiButton,
  EuiPopover,
  EuiLink,
  EuiText,
  EuiSpacer,
  EuiPopoverTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { getCoreStart } from '../../../../services';
import { PopoverProps } from './types';

const availabilityForMigration = i18n.translate(
  'visTypeTimeseries.indexPatternSelect.migrationPopover.availabilityForMigration',
  {
    defaultMessage: 'Availability for migration',
  }
);

const getReadyToMigrateCallOut = (value: PopoverProps['value'], onModeChange: () => void) => (
  <>
    <EuiText size="s" style={{ width: 300 }}>
      <p>
        <FormattedMessage
          id="visTypeTimeseries.indexPatternSelect.migrationPopover.readyToMigrateText"
          defaultMessage="We found that you already have '{index}' index on your instance."
          values={{
            index: <EuiTextColor color="secondary">{value}</EuiTextColor>,
          }}
        />
      </p>
    </EuiText>
    <EuiSpacer />
    <EuiButton fullWidth={true} iconType="gear" size="s" onClick={onModeChange}>
      <FormattedMessage
        id="visTypeTimeseries.indexPatternSelect.migrationPopover.useKibanaIndexLabel"
        defaultMessage="Use Kibana index"
      />
    </EuiButton>
  </>
);

const getNoMatchedIndicesCallOut = (
  value: PopoverProps['value'],
  onCreateIndexClick: () => void
) => (
  <>
    <EuiText size="s" style={{ width: 300 }}>
      <p>
        <FormattedMessage
          id="visTypeTimeseries.indexPatternSelect.migrationPopover.noMatchedIndicesCallOutText"
          defaultMessage="Before switching mode you should create a Kibana index pattern for '{index}'."
          values={{
            index: <EuiTextColor color="secondary">{value}</EuiTextColor>,
          }}
        />
      </p>
    </EuiText>
    <EuiSpacer />
    <EuiButton fullWidth={true} iconType="plusInCircle" size="s" onClick={onCreateIndexClick}>
      <FormattedMessage
        id="visTypeTimeseries.indexPatternSelect.migrationPopover.createIndexPatternText"
        defaultMessage="Create index pattern"
      />
    </EuiButton>
  </>
);

export const MigrationPopover = ({ value, onModeChange, matchedIndex }: PopoverProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const onButtonClick = useCallback(() => setIsPopoverOpen((isOpen) => !isOpen), []);

  const switchMode = useCallback(() => {
    onModeChange(true);
  }, [onModeChange]);

  const navigateToCreateIndexPatterns = useCallback(() => {
    getCoreStart().application.navigateToApp('management', {
      path: `/kibana/indexPatterns/create?name=${value}`,
    });
  }, [value]);

  return (
    <EuiPopover
      ownFocus
      button={
        <EuiLink onClick={onButtonClick}>
          <EuiText size="xs">{availabilityForMigration}</EuiText>
        </EuiLink>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
    >
      <EuiPopoverTitle> {availabilityForMigration} </EuiPopoverTitle>
      {matchedIndex && getReadyToMigrateCallOut(value, switchMode)}
      {!matchedIndex && getNoMatchedIndicesCallOut(value, navigateToCreateIndexPatterns)}
    </EuiPopover>
  );
};
