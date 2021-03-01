/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback } from 'react';
import { EuiButtonEmpty, EuiPopover, EuiFormRow, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SelectIndexComponentProps } from './types';

type SwitchModePopoverProps = Pick<SelectIndexComponentProps, 'onModeChange'> & {
  isKibanaIndicesModeOn: boolean;
};

export const SwitchModePopover = ({
  isKibanaIndicesModeOn,
  onModeChange,
}: SwitchModePopoverProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const onButtonClick = useCallback(() => setIsPopoverOpen((isOpen) => !isOpen), []);

  const onChange = useCallback(
    (e) => {
      onModeChange(e.target.checked);
    },
    [onModeChange]
  );

  return (
    <EuiPopover
      button={
        <EuiButtonEmpty
          iconType={'gear'}
          size="xs"
          aria-label={i18n.translate(
            'visTypeTimeseries.indexPatternSelect.switchModePopover.areaLabel',
            {
              defaultMessage: 'Switch index pattern selection mode',
            }
          )}
          onClick={onButtonClick}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      style={{ height: 'auto' }}
    >
      <EuiFormRow
        label={i18n.translate(
          'visTypeTimeseries.indexPatternSelect.switchModePopover.useKibanaIndices',
          {
            defaultMessage: 'Use Kibana indices?',
          }
        )}
        hasChildLabel={false}
      >
        <EuiSwitch
          name="switch"
          checked={isKibanaIndicesModeOn}
          label={
            isKibanaIndicesModeOn
              ? i18n.translate('visTypeTimeseries.indexPatternSelect.switchModePopover.on', {
                  defaultMessage: 'On',
                })
              : i18n.translate('visTypeTimeseries.indexPatternSelect.switchModePopover.off', {
                  defaultMessage: 'Off',
                })
          }
          onChange={onChange}
        />
      </EuiFormRow>
    </EuiPopover>
  );
};
