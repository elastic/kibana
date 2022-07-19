/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFocusTrap,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOutsideClickDetector,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiText,
} from '@elastic/eui';
import { FiltersNotificationActionContext, UnlinkFromLibraryAction } from '.';
import { dashboardLibraryNotification } from '../../dashboard_strings';

export interface FiltersNotificationProps {
  context: FiltersNotificationActionContext;
  displayName: string;
  icon: string;
  id: string;
  closeModal: () => void;
}

export function FiltersNotificationModal({
  context,
  displayName,
  icon,
  id,
  closeModal,
}: FiltersNotificationProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { embeddable } = context;

  const panelFilters = useMemo(() => {
    return JSON.stringify(embeddable.getFilters());
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
                <p id={'panelIdd'}>{panelFilters}</p>
              </EuiText>
            </>
          </EuiModalBody>
        </>
      </EuiOutsideClickDetector>
    </EuiFocusTrap>
  );
}
