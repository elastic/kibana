/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { RefObject, useMemo } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { EuiMark } from '@elastic/eui';
import { EuiHighlight } from '@elastic/eui';
import { throttle } from 'lodash';

interface TruncatedLabelProps {
  label: string;
  search: string;
  comboBoxRef: RefObject<HTMLInputElement>;
  defaultFont: string;
  defaultComboboxWidth: number;
  comboboxPaddings: number;
}

const createContext = () =>
  document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;

// extracted from getTextWidth for performance
const context = createContext();

const getTextWidth = (text: string, font: string) => {
  const ctx = context ?? createContext();
  ctx.font = font;
  const metrics = ctx.measureText(text);
  return metrics.width;
};

const truncateLabel = (
  width: number,
  font: string,
  label: string,
  approximateLength: number,
  labelFn: (label: string, length: number) => string
) => {
  let output = labelFn(label, approximateLength);

  while (getTextWidth(output, font) > width) {
    approximateLength = approximateLength - 1;
    const newOutput = labelFn(label, approximateLength);
    if (newOutput === output) {
      break;
    }
    output = newOutput;
  }
  return output;
};

export const TruncatedLabel = React.memo(function TruncatedLabel({
  label,
  comboBoxRef,
  search,
  defaultFont,
  defaultComboboxWidth,
  comboboxPaddings,
}: TruncatedLabelProps) {
  const [labelProps, setLabelProps] = React.useState<{
    width: number;
    font: string;
  }>({
    width: defaultComboboxWidth - comboboxPaddings,
    font: defaultFont,
  });

  const computeStyles = (_e: UIEvent | undefined, shouldRecomputeAll = false) => {
    if (comboBoxRef.current) {
      const current = {
        ...labelProps,
        width: comboBoxRef.current?.clientWidth - comboboxPaddings,
      };
      if (shouldRecomputeAll) {
        current.font = window.getComputedStyle(comboBoxRef.current).font;
      }
      setLabelProps(current);
    }
  };

  const handleResize = throttle((_e: UIEvent | undefined, shouldRecomputeAll = false) => {
    computeStyles(_e, shouldRecomputeAll);
  }, 50);

  useEffectOnce(() => {
    if (comboBoxRef.current) {
      handleResize(undefined, true);
    }

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  const textWidth = useMemo(() => getTextWidth(label, labelProps.font), [label, labelProps.font]);

  if (textWidth < labelProps.width) {
    return <EuiHighlight search={search}>{label}</EuiHighlight>;
  }

  const searchPosition = label.indexOf(search);
  const approximateLen = Math.round((labelProps.width * label.length) / textWidth);
  const separator = `…`;
  let separatorsLength = separator.length;
  let labelFn;

  if (!search || searchPosition === -1) {
    labelFn = (text: string, length: number) =>
      `${text.substr(0, 8)}${separator}${text.substr(text.length - (length - 8))}`;
  } else if (searchPosition === 0) {
    // search phrase at the beginning
    labelFn = (text: string, length: number) => `${text.substr(0, length)}${separator}`;
  } else if (approximateLen > label.length - searchPosition) {
    // search phrase close to the end or at the end
    labelFn = (text: string, length: number) => `${separator}${text.substr(text.length - length)}`;
  } else {
    // search phrase is in the middle
    labelFn = (text: string, length: number) =>
      `${separator}${text.substr(searchPosition, length)}${separator}`;
    separatorsLength = 2 * separator.length;
  }

  const outputLabel = truncateLabel(
    labelProps.width,
    labelProps.font,
    label,
    approximateLen,
    labelFn
  );

  return search.length < outputLabel.length - separatorsLength ? (
    <EuiHighlight search={search}>{outputLabel}</EuiHighlight>
  ) : (
    <EuiMark>{outputLabel}</EuiMark>
  );
});
