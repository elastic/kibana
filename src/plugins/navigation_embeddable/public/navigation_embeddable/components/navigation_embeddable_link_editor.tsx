/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';

import {
  EuiForm,
  EuiButton,
  EuiFormRow,
  EuiFieldText,
  EuiPopoverFooter,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { useNavigationEmbeddable } from '../embeddable/navigation_embeddable';
import { NavigationEmbeddableDashboardList } from './navigation_embeddable_dashboard_list';
import { DashboardItem } from '../types';

export const NavigationEmbeddableLinkEditor = ({
  setIsPopoverOpen,
}: {
  setIsPopoverOpen: (open: boolean) => void;
}) => {
  const navEmbeddable = useNavigationEmbeddable();

  const [linkLabel, setLinkLabel] = useState<string>('');
  const [selectedUrl, setSelectedUrl] = useState<string>();
  const [selectedDashboard, setSelectedDashboard] = useState<DashboardItem | undefined>();

  return (
    <>
      <EuiForm component="form">
        <EuiFormRow label="Choose destination">
          <NavigationEmbeddableDashboardList
            onUrlSelected={setSelectedUrl}
            onDashboardSelected={setSelectedDashboard}
          />
        </EuiFormRow>
        <EuiFormRow label="Text">
          <EuiFieldText
            placeholder={
              selectedDashboard ? selectedDashboard.attributes.title : 'Enter text for link'
            }
            value={linkLabel}
            onChange={(e) => {
              setLinkLabel(e.target.value);
            }}
            aria-label="Use aria labels when no actual label is in use"
          />
        </EuiFormRow>
      </EuiForm>
      <EuiPopoverFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              onClick={() => {
                if (selectedDashboard) {
                  navEmbeddable.dispatch.addDashboardLink({
                    label: linkLabel,
                    id: selectedDashboard.id,
                    title: selectedDashboard.attributes.title,
                    description: selectedDashboard.attributes.description,
                  });
                } else if (selectedUrl) {
                  navEmbeddable.dispatch.addExternalLink({ url: selectedUrl, label: linkLabel });
                }
                setLinkLabel('');
                setIsPopoverOpen(false);
              }}
            >
              Apply
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </>
  );
};
