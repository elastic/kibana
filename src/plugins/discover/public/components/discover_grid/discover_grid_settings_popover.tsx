/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiButtonIcon, EuiFormRow, EuiPopover, EuiRange, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';

const MAX_ALLOWED_SAMPLE_SIZE = 3000;

export function DiscoverGridSettingsPopover({
  sampleSize,
  onChangeSampleSize,
}: {
  sampleSize: number;
  onChangeSampleSize: (sampleSize: number) => void;
}) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeSampleSize, setActiveSampleSize] = useState<number>(sampleSize);

  const openPopover = useCallback(() => {
    setIsPopoverOpen(true);
  }, []);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
    setActiveSampleSize(sampleSize);
  }, [sampleSize]);

  const debouncedOnChangeSampleSize = useMemo(
    () => debounce(onChangeSampleSize, 300, { leading: false, trailing: true }),
    [onChangeSampleSize]
  );

  const onChangeActiveSampleSize = useCallback(
    (event) => {
      const newSampleSize = Number(event.target.value);
      if (newSampleSize > 0) {
        setActiveSampleSize(newSampleSize);
        if (newSampleSize <= MAX_ALLOWED_SAMPLE_SIZE) {
          debouncedOnChangeSampleSize(newSampleSize);
        }
      }
    },
    [setActiveSampleSize, debouncedOnChangeSampleSize]
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
            onClick={isPopoverOpen ? closePopover : openPopover}
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
          max={MAX_ALLOWED_SAMPLE_SIZE}
          step={1}
          value={activeSampleSize}
          onChange={onChangeActiveSampleSize}
          data-test-subj="gridSettingsSampleSizeRange"
        />
      </EuiFormRow>
    </EuiPopover>
  );
}
