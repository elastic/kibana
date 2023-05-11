/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiButtonIcon, EuiFormRow, EuiPopover, EuiRange, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useDebounce from 'react-use/lib/useDebounce';

export function DiscoverGridSettingsPopover({
  sampleSize,
  onChangeSampleSize,
}: {
  sampleSize: number;
  onChangeSampleSize: (sampleSize: number) => void;
}) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeSampleSize, setActiveSampleSize] = useState<number>(sampleSize);

  const togglePopover = useCallback(() => {
    setIsPopoverOpen((isOpen) => !isOpen);
  }, []);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const onChangeActiveSampleSize = useCallback(
    (event) => {
      const newSampleSize = Number(event.target.value);
      if (newSampleSize > 0) {
        setActiveSampleSize(newSampleSize);
      }
    },
    [setActiveSampleSize]
  );

  const buttonLabel = i18n.translate('discover.grid.settingsPopover.buttonLabel', {
    defaultMessage: 'Settings',
  });

  const sampleSizeLabel = i18n.translate('discover.grid.settingsPopover.sampleSizeLabel', {
    defaultMessage: 'Sample size',
  });

  useEffect(() => {
    setActiveSampleSize(sampleSize); // reset local state
  }, [sampleSize, setActiveSampleSize]);

  useDebounce(
    () => {
      onChangeSampleSize(activeSampleSize);
    },
    300,
    [activeSampleSize, onChangeSampleSize]
  );

  return (
    <EuiPopover
      data-test-subj="dscGridSettingsPopover"
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="downRight"
      panelPaddingSize="s"
      panelClassName="euiDataGrid__displayPopoverPanel"
      button={
        <EuiToolTip content={buttonLabel} delay="long">
          <EuiButtonIcon
            size="xs"
            iconType="gear"
            color="text"
            data-test-subj="dscGridSettingsPopoverButton"
            onClick={togglePopover}
            aria-label={buttonLabel}
          />
        </EuiToolTip>
      }
    >
      <EuiFormRow label={sampleSizeLabel} display="columnCompressed">
        <EuiRange
          compressed
          fullWidth
          showInput
          min={1}
          max={3000}
          step={1}
          value={activeSampleSize}
          onChange={onChangeActiveSampleSize}
          data-test-subj="gridSettingsSampleSizeRange"
        />
      </EuiFormRow>
    </EuiPopover>
  );
}
