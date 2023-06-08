/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useState, useRef, useEffect } from 'react';

import { EuiInputPopover } from '@elastic/eui';

import { useRangeSlider } from '../embeddable/range_slider_embeddable';
import { RangeSliderPopover, EuiDualRangeRef } from './range_slider_popover';

import './range_slider.scss';
import { ControlError } from '../../control_group/component/control_error_component';
import { RangeSliderButton } from './range_slider_button';

export const RangeSliderControl: FC = () => {
  const rangeRef = useRef<EuiDualRangeRef>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const rangeSlider = useRangeSlider();

  const error = rangeSlider.select((state) => state.componentState.error);
  const value = rangeSlider.select((state) => state.explicitInput.value);

  const [currentRange, setCurrentRange] = useState(value);

  useEffect(() => {
    rangeSlider.dispatch.setSelectedRange(currentRange);
  }, [currentRange, rangeSlider.dispatch]);

  const button = (
    <RangeSliderButton
      currentRange={currentRange}
      onChange={setCurrentRange}
      onClick={(event) => {
        // the popover should remain open if the click target is one of the number inputs
        if (isPopoverOpen && event.target instanceof HTMLInputElement) {
          return;
        }
        setIsPopoverOpen(!isPopoverOpen);
      }}
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
        rangeSlider.publishNewRange();
        setIsPopoverOpen(false);
      }}
      anchorPosition="downCenter"
      attachToAnchor={false}
      disableFocusTrap
      onPanelResize={(width) => {
        rangeRef.current?.onResize(width);
      }}
    >
      <RangeSliderPopover
        rangeRef={rangeRef}
        currentRange={currentRange}
        onChange={setCurrentRange}
      />
    </EuiInputPopover>
  );
};
