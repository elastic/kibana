/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Ref } from 'react';
import { debounce } from 'lodash';
import type {
  UnifiedHistogramContainerProps,
  UnifiedHistogramApi,
} from '@kbn/unified-histogram-plugin/public';

type Props = Omit<UnifiedHistogramContainerProps, 'container'> & {
  ref: Ref<UnifiedHistogramApi>;
};
let debouncedProps: Props | undefined;

const updateDebouncedProps = debounce(
  (props: Props) => {
    // console.log('updated props', props.timeRange, props.filters?.length);
    debouncedProps = props;
  },
  100,
  { leading: false, trailing: true }
);

export const getDebouncedHistogramProps = (props: Props): Props => {
  if (!debouncedProps) {
    debouncedProps = props;
  } else {
    // console.log('next props', props.timeRange, props.filters?.length);
    updateDebouncedProps(props);
  }

  return debouncedProps;
};

export const clearDebouncedHistogramProps = () => {
  debouncedProps = undefined;
};
