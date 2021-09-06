/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButtonIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';

import type { PopoverProps } from './types';
import { getUISettings } from '../../../../services';
import { UI_SETTINGS } from '../../../../../../data/common';

export const SwitchModePopover = ({ onModeChange, useKibanaIndices }: PopoverProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const onButtonClick = useCallback(() => setIsPopoverOpen((isOpen) => !isOpen), []);

  const switchMode = useCallback(() => {
    onModeChange(!useKibanaIndices);
  }, [onModeChange, useKibanaIndices]);

  const stringIndicesAllowed = getUISettings().get(UI_SETTINGS.ALLOW_STRING_INDICES);
  const isSwitchDisabled = useKibanaIndices && !stringIndicesAllowed;

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          iconType={'gear'}
          aria-label={i18n.translate(
            'visTypeTimeseries.indexPatternSelect.switchModePopover.areaLabel',
            {
              defaultMessage: 'Configure index pattern selection mode',
            }
          )}
          onClick={onButtonClick}
          data-test-subj="switchIndexPatternSelectionModePopoverButton"
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      style={{ height: 'auto' }}
    >
      <div
        style={{ width: '360px' }}
        data-test-subj="switchIndexPatternSelectionModePopoverContent"
      >
        <EuiPopoverTitle>
          {i18n.translate('visTypeTimeseries.indexPatternSelect.switchModePopover.title', {
            defaultMessage: 'Index pattern selection mode',
          })}
        </EuiPopoverTitle>
        <EuiText>
          <FormattedMessage
            id="visTypeTimeseries.indexPatternSelect.switchModePopover.text"
            defaultMessage="An index pattern identifies one or more Elasticsearch indices that you want to explore.
            You can use Elasticsearch indices or Kibana index patterns (recommended)."
          />
        </EuiText>
        <EuiSpacer />
        <EuiToolTip
          content={
            isSwitchDisabled && (
              <FormattedMessage
                id="visTypeTimeseries.indexPatternSelect.switchModePopover.tooltip"
                defaultMessage="Using Elasticsearch indices is not recommended.
      To use index patterns, go to {advancedSettings}, then enable {allowStringIndices}."
                values={{
                  advancedSettings: <strong>Advanced Settings</strong>,
                  allowStringIndices: <strong>Allow string indices in TSVB</strong>,
                }}
              />
            )
          }
        >
          <EuiSwitch
            checked={useKibanaIndices}
            label={i18n.translate(
              'visTypeTimeseries.indexPatternSelect.switchModePopover.useKibanaIndices',
              {
                defaultMessage: 'Use only index patterns',
              }
            )}
            onChange={switchMode}
            disabled={isSwitchDisabled}
            data-test-subj="switchIndexPatternSelectionMode"
          />
        </EuiToolTip>
      </div>
    </EuiPopover>
  );
};
