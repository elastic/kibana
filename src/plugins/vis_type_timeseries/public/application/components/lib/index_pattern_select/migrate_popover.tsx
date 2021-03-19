/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiTextColor,
  EuiButton,
  EuiPopover,
  EuiLink,
  EuiText,
  EuiSpacer,
  EuiPopoverTitle,
} from '@elastic/eui';

import { getCoreStart } from '../../../../services';
import type { PopoverProps } from './types';

const switchModeLabel = i18n.translate(
  'visTypeTimeseries.indexPatternSelect.migrationPopover.switchMode',
  {
    defaultMessage: 'Switch mode',
  }
);

const getReadyToSwitchCallOut = (value: string, onModeChange: () => void) => (
  <>
    <EuiText size="s" style={{ width: 300 }}>
      <p>
        <FormattedMessage
          id="visTypeTimeseries.indexPatternSelect.migrationPopover.readyToSwitchText"
          defaultMessage="{index}' is already on your instance."
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

const getNoMatchedIndicesCallOut = (value: string, onCreateIndexClick: () => void) => (
  <>
    <EuiText size="s" style={{ width: 300 }}>
      <p>
        <FormattedMessage
          id="visTypeTimeseries.indexPatternSelect.migrationPopover.noMatchedIndicesCallOutText"
          defaultMessage="Before switching mode, create an index pattern pattern for '{index}'."
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

export const MigrationPopover = ({ fetchedIndex, onModeChange }: PopoverProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const onButtonClick = useCallback(() => setIsPopoverOpen((isOpen) => !isOpen), []);

  const switchMode = useCallback(() => {
    onModeChange(true, fetchedIndex);
  }, [onModeChange, fetchedIndex]);

  const navigateToCreateIndexPatterns = useCallback(() => {
    const coreStart = getCoreStart();

    coreStart.application.navigateToApp('management', {
      path: `/kibana/indexPatterns/create?name=${fetchedIndex.indexPatternString ?? ''}`,
    });
  }, [fetchedIndex]);

  if (!fetchedIndex.indexPatternString) {
    return null;
  }

  return (
    <EuiPopover
      ownFocus
      button={
        <EuiLink onClick={onButtonClick}>
          <EuiText size="xs">{switchModeLabel}</EuiText>
        </EuiLink>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
    >
      <EuiPopoverTitle> {switchModeLabel} </EuiPopoverTitle>
      {fetchedIndex.indexPattern &&
        getReadyToSwitchCallOut(fetchedIndex.indexPatternString, switchMode)}

      {!fetchedIndex.indexPattern &&
        getNoMatchedIndicesCallOut(fetchedIndex.indexPatternString, navigateToCreateIndexPatterns)}
    </EuiPopover>
  );
};
