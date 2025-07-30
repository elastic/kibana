/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
import type { TabItem } from '../types';

export const useNewTabProps = ({ numberOfInitialItems }: { numberOfInitialItems: number }) => {
  const counterRef = useRef<number>(numberOfInitialItems);

  const getNewTabDefaultProps = useCallback((): Pick<TabItem, 'id' | 'label'> => {
    counterRef.current += 1;
    return getNewTabPropsForIndex(counterRef.current);
  }, []);

  return {
    getNewTabDefaultProps,
  };
};

export function getNewTabPropsForIndex(index: number): Pick<TabItem, 'id' | 'label'> {
  return {
    id: uuidv4(),
    label: i18n.translate('unifiedTabs.defaultNewTabLabel', {
      defaultMessage: 'Untitled {counter}',
      values: { counter: index },
    }),
  };
}
