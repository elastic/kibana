/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiButtonIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiLink,
} from '@elastic/eui';

import type { PopoverProps } from './types';
import { getCoreStart, getUISettings } from '../../../../services';
import { UI_SETTINGS } from '../../../../../common/constants';

const allowStringIndicesMessage = i18n.translate(
  'visTypeTimeseries.indexPatternSelect.switchModePopover.allowStringIndices',
  { defaultMessage: 'Allow string indices in TSVB' }
);

export const SwitchModePopover = ({ onModeChange, useKibanaIndices }: PopoverProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const onButtonClick = useCallback(() => setIsPopoverOpen((isOpen) => !isOpen), []);

  const switchMode = useCallback(() => {
    onModeChange(!useKibanaIndices);
  }, [onModeChange, useKibanaIndices]);

  const { application } = getCoreStart();
  const canEditAdvancedSettings = application.capabilities.advancedSettings.save;

  const handleAllowStringIndicesLinkClick = useCallback(
    () =>
      application.navigateToApp('management', {
        path: `/kibana/settings?query=${UI_SETTINGS.ALLOW_STRING_INDICES}`,
      }),
    [application]
  );

  const stringIndicesAllowed = getUISettings().get(UI_SETTINGS.ALLOW_STRING_INDICES);
  const isSwitchDisabled = useKibanaIndices && !stringIndicesAllowed;

  let allowStringIndicesLabel;
  if (!stringIndicesAllowed) {
    allowStringIndicesLabel = (
      <FormattedMessage
        id="visTypeTimeseries.indexPatternSelect.switchModePopover.enableAllowStringIndices"
        defaultMessage="To query Elasticsearch indices, you must enable the {allowStringIndices} setting."
        values={{
          allowStringIndices: canEditAdvancedSettings ? (
            <EuiLink color="accent" onClick={handleAllowStringIndicesLinkClick}>
              {allowStringIndicesMessage}
            </EuiLink>
          ) : (
            <strong>{allowStringIndicesMessage}</strong>
          ),
        }}
      />
    );
  }

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          iconType={'gear'}
          aria-label={i18n.translate(
            'visTypeTimeseries.indexPatternSelect.switchModePopover.areaLabel',
            {
              defaultMessage: 'Configure data view selection mode',
            }
          )}
          onClick={onButtonClick}
          data-test-subj="switchIndexPatternSelectionModePopoverButton"
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      style={{ height: 'auto' }}
      initialFocus={false}
    >
      <div
        style={{ width: '360px' }}
        data-test-subj="switchIndexPatternSelectionModePopoverContent"
      >
        <EuiPopoverTitle>
          {i18n.translate('visTypeTimeseries.indexPatternSelect.switchModePopover.title', {
            defaultMessage: 'Data view mode',
          })}
        </EuiPopoverTitle>
        <EuiText>
          <FormattedMessage
            id="visTypeTimeseries.indexPatternSelect.switchModePopover.text"
            defaultMessage="A data view groups and retrieves data from Elasticsearch. Disable this mode to directly query Elasticsearch indices instead. {allowStringIndicesLabel}"
            values={{
              allowStringIndicesLabel,
            }}
          />
        </EuiText>
        <EuiSpacer />
        <EuiSwitch
          checked={useKibanaIndices}
          label={i18n.translate(
            'visTypeTimeseries.indexPatternSelect.switchModePopover.useKibanaIndices',
            {
              defaultMessage: 'Use Kibana data views',
            }
          )}
          onChange={switchMode}
          disabled={isSwitchDisabled}
          data-test-subj="switchIndexPatternSelectionMode"
        />
      </div>
    </EuiPopover>
  );
};
