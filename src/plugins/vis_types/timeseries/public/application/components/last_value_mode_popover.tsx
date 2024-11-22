/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import './last_value_mode_popover.scss';

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiPopover, EuiPopoverTitle, EuiSwitch } from '@elastic/eui';

interface LastValueModePopoverProps {
  isIndicatorDisplayed: boolean;
  toggleIndicatorDisplay: () => void;
}

export const LastValueModePopover = ({
  isIndicatorDisplayed,
  toggleIndicatorDisplay,
}: LastValueModePopoverProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onButtonClick = useCallback(() => setIsPopoverOpen((isOpen) => !isOpen), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  return (
    <EuiPopover
      className="tvbLastValueModePopover"
      button={
        <EuiButtonIcon
          iconType={'gear'}
          onClick={onButtonClick}
          aria-label={i18n.translate('visTypeTimeseries.lastValueModePopover.gearButton', {
            defaultMessage: 'Change last value indicator display option',
          })}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
    >
      <div className="tvbLastValueModePopoverBody">
        <EuiPopoverTitle>
          {i18n.translate('visTypeTimeseries.lastValueModePopover.title', {
            defaultMessage: 'Last value options',
          })}
        </EuiPopoverTitle>
        <EuiSwitch
          checked={isIndicatorDisplayed}
          label={i18n.translate('visTypeTimeseries.lastValueModePopover.switch', {
            defaultMessage: 'Show label when using Last value mode',
          })}
          onChange={toggleIndicatorDisplay}
        />
      </div>
    </EuiPopover>
  );
};
