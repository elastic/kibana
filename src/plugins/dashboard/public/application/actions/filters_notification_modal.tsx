/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiFocusTrap,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOutsideClickDetector,
  EuiText,
} from '@elastic/eui';
import { isFilterableEmbeddable } from '@kbn/embeddable-plugin/public';
import { FiltersNotificationActionContext } from './filters_notification_badge';

export interface FiltersNotificationProps {
  context: FiltersNotificationActionContext;
  displayName: string;
  icon: string;
  id: string;
  closeModal: () => void;
  contents: JSX.Element;
}

export function FiltersNotificationModal({
  context,
  displayName,
  icon,
  id,
  closeModal,
  contents,
}: FiltersNotificationProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { embeddable } = context;

  // const getLabel = (filter: Filter) => {
  //   const valueLabel = getDisplayValueFromFilter(filter, [await dataViews.getDefaultDataView()]);
  //   const fieldLabel = getFieldDisplayValueFromFilter(filter, this.props.indexPatterns);
  //   return <FilterLabel filter={filter} valueLabel={valueLabel} fieldLabel={fieldLabel} />;
  // };

  const panelFilters = useMemo(() => {
    if (!isFilterableEmbeddable(embeddable)) return;
    const filters = embeddable.getFilters() ?? [];
    return JSON.stringify(filters);
  }, [embeddable]);

  return (
    <EuiFocusTrap clickOutsideDisables={true}>
      <EuiOutsideClickDetector onOutsideClick={closeModal}>
        <>
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              <h2 id={'titleId'}>{'Custom filters'}</h2>
            </EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <>
              <EuiText>
                <p id={'panelIdd'}>{contents}</p>
              </EuiText>
            </>
          </EuiModalBody>
        </>
      </EuiOutsideClickDetector>
    </EuiFocusTrap>
  );
}
