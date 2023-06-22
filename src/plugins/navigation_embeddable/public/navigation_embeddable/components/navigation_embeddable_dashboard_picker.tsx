/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useState } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiListGroup,
  EuiListGroupItemProps,
  EuiPopover,
  EuiPopoverFooter,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { SelectedDashboard } from '../types';
import { useNavigationEmbeddable } from '../embeddable/navigation_embeddable';
import { NavigationEmbeddableDashboardList } from './navigation_embeddable_dashboard_list';

export const NavigationEmbeddableDashboardPicker = () => {
  const navigationEmbeddable = useNavigationEmbeddable();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState<SelectedDashboard | undefined>();

  const onButtonClick = useCallback(() => setIsPopoverOpen((isOpen) => !isOpen), []);

  const button = (
    <EuiButtonEmpty onClick={onButtonClick} iconType="plusInCircle">
      Add link
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      button={button}
      panelStyle={{ width: 300 }}
      isOpen={isPopoverOpen}
      panelPaddingSize="s"
      closePopover={() => setIsPopoverOpen(false)}
    >
      <EuiForm component="form">
        <EuiFormRow label="Dashboard">
          <NavigationEmbeddableDashboardList
            // embeddable={embeddable}
            onDashboardSelected={setSelectedDashboard}
          />
        </EuiFormRow>
        <EuiFormRow label="Text">
          <EuiFieldText
            placeholder={selectedDashboard ? selectedDashboard.title : 'Select a dashboard'}
            // value={value}
            // onChange={(e) => onChange(e)}
            aria-label="Use aria labels when no actual label is in use"
          />
        </EuiFormRow>
      </EuiForm>
      <EuiPopoverFooter>
        <EuiButton
          size="s"
          fullWidth
          onClick={() => {
            console.log('confirm', selectedDashboard);
            if (selectedDashboard) {
              navigationEmbeddable.dispatch.addLink(selectedDashboard);
              // const currentLinks = embeddable.getExplicitInput().dashboardLinks ?? [];
              // embeddable?.updateInput({ dashboardLinks: [...currentLinks, selectedDashboard] });
            }
            setIsPopoverOpen(false);
          }}
        >
          Confirm
        </EuiButton>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};
