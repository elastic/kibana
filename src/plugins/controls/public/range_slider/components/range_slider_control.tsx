/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { debounce } from 'lodash';
import React, { FC, useState, useRef, useMemo, useEffect } from 'react';

import { EuiInputPopover } from '@elastic/eui';

import { useRangeSlider } from '../embeddable/range_slider_embeddable';
import { RangeSliderPopover, EuiDualRangeRef } from './range_slider_popover';

import { ControlError } from '../../control_group/component/control_error_component';
import { RangeValue } from '../../../common/range_slider/types';
import { RangeSliderButton } from './range_slider_button';
import './range_slider.scss';

export const RangeSliderControl: FC = () => {
  const rangeRef = useRef<EuiDualRangeRef>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const rangeSlider = useRangeSlider();

  const error = rangeSlider.select((state) => state.componentState.error);
  const value = rangeSlider.select((state) => state.explicitInput.value);
  const [displayedValue, setDisplayedValue] = useState<RangeValue>(value ?? ['', '']);

  const debouncedOnChange = useMemo(
    () =>
      debounce((newRange: RangeValue) => {
        rangeSlider.dispatch.setSelectedRange(newRange);
      }, 750),
    [rangeSlider.dispatch]
  );

  useEffect(() => {
    debouncedOnChange(displayedValue);
  }, [debouncedOnChange, displayedValue]);

  useEffect(() => {
    setDisplayedValue(value ?? ['', '']);
  }, [value]);

  const button = (
    <RangeSliderButton
      value={displayedValue}
      onChange={setDisplayedValue}
      isPopoverOpen={isPopoverOpen}
      setIsPopoverOpen={setIsPopoverOpen}
    />
  );

  return error ? (
    <ControlError error={error} />
  ) : (
    <EuiInputPopover
      input={button}
      isOpen={isPopoverOpen}
      display="block"
      panelPaddingSize="s"
      className="rangeSlider__popoverOverride"
      anchorClassName="rangeSlider__anchorOverride"
      panelClassName="rangeSlider__panelOverride"
      closePopover={() => {
        setIsPopoverOpen(false);
      }}
      anchorPosition="downCenter"
      attachToAnchor={false}
      disableFocusTrap
      onPanelResize={(width) => {
        rangeRef.current?.onResize(width);
      }}
    >
      <RangeSliderPopover rangeRef={rangeRef} value={displayedValue} onChange={setDisplayedValue} />
    </EuiInputPopover>
  );
};
