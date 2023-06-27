/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEmpty } from 'lodash';
import React, { useRef, useState } from 'react';

import {
  EuiForm,
  EuiIcon,
  EuiFormRow,
  EuiFlexItem,
  EuiFieldText,
  EuiFlexGroup,
  EuiRadioGroup,
  EuiButtonEmpty,
  EuiPopoverFooter,
  EuiRadioGroupOption,
} from '@elastic/eui';

import { useNavigationEmbeddable } from '../embeddable/navigation_embeddable';
import { NavigationEmbeddableDashboardList } from './navigation_embeddable_dashboard_list';
import { DashboardItem } from '../types';

// TODO: As part of https://github.com/elastic/kibana/issues/154381, replace this regex URL check with more robost url validation
const isValidUrl =
  /^https?:\/\/(?:www.)?[-a-zA-Z0-9@:%._+~#=]{1,256}.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;

export const NavigationEmbeddableEditor = ({
  setIsPopoverOpen,
}: {
  setIsPopoverOpen: (open: boolean) => void;
}) => {
  const navEmbeddable = useNavigationEmbeddable();

  const [linkLabel, setLinkLabel] = useState<string>('');
  const [selectedLinkType, setSelectedLinkType] = useState('dashboardLink');

  /** external URL link state */
  const [validUrl, setValidUrl] = useState<boolean>(true);
  const [selectedUrl, setSelectedUrl] = useState<string>();

  /** dashboard link state */
  const [selectedDashboard, setSelectedDashboard] = useState<DashboardItem | undefined>();
  const savedDashboardSelection = useRef<DashboardItem | undefined>(undefined);

  const linkTypes: EuiRadioGroupOption[] = [
    {
      label: (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type={'dashboardApp'} color="text" />
          </EuiFlexItem>
          <EuiFlexItem>Dashboard</EuiFlexItem>
        </EuiFlexGroup>
      ),
      id: 'dashboardLink',
    },
    {
      label: (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type={'link'} color="text" />
          </EuiFlexItem>
          <EuiFlexItem>URL</EuiFlexItem>
        </EuiFlexGroup>
      ),
      id: 'externalLink',
    },
  ];

  return (
    <>
      <EuiForm component="form">
        <EuiFormRow label="Go to">
          <EuiRadioGroup
            options={linkTypes}
            idSelected={selectedLinkType}
            onChange={(id) => {
              setSelectedLinkType(id);
              if (selectedDashboard) {
                savedDashboardSelection.current = selectedDashboard;
              }
            }}
            name="radio group"
          />
        </EuiFormRow>
        <EuiFormRow label="Choose destination">
          {selectedLinkType === 'dashboardLink' ? (
            <NavigationEmbeddableDashboardList
              initialSelection={savedDashboardSelection.current}
              onDashboardSelected={setSelectedDashboard}
            />
          ) : (
            <EuiFieldText
              placeholder={'Enter external URL'}
              aria-label="Use aria labels when no actual label is in use"
              isInvalid={!validUrl}
              onChange={(e) => {
                const url = e.target.value;
                const isValid = isValidUrl.test(url);
                if (isValid) {
                  setSelectedUrl(url);
                }
                setValidUrl(isValid);
              }}
            />
          )}
        </EuiFormRow>
        <EuiFormRow label="Text">
          <EuiFieldText
            placeholder={
              selectedLinkType === 'dashboardLink' && selectedDashboard
                ? selectedDashboard.attributes.title
                : 'Enter text for link'
            }
            value={linkLabel}
            onChange={(e) => {
              setLinkLabel(e.target.value);
            }}
            aria-label="Use aria labels when no actual label is in use"
          />
        </EuiFormRow>
        {/* TODO: As part of https://github.com/elastic/kibana/issues/154381, we should pull in the custom settings for each link type.
            Refer to `x-pack/examples/ui_actions_enhanced_examples/public/drilldowns/dashboard_to_discover_drilldown/collect_config_container.tsx`
            for the dashboard drilldown settings, for example. 

            Open question: It probably makes sense to re-use these components so any changes made to the drilldown architecture
            trickle down to the navigation embeddable - this would require some refactoring, though. Is this a goal for MVP?
         */}
      </EuiForm>
      <EuiPopoverFooter className="navEmbeddable-editorFooter">
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              disabled={
                (selectedLinkType === 'dashboardLink' && !selectedDashboard) ||
                (selectedLinkType === 'externalLink' && (!validUrl || isEmpty(selectedUrl)))
              }
              onClick={() => {
                if (selectedLinkType === 'dashboardLink' && selectedDashboard) {
                  navEmbeddable.dispatch.addDashboardLink({
                    label: linkLabel,
                    id: selectedDashboard.id,
                    title: selectedDashboard.attributes.title,
                    description: selectedDashboard.attributes.description,
                  });
                } else if (selectedLinkType === 'externalLink' && validUrl && selectedUrl) {
                  navEmbeddable.dispatch.addExternalLink({ url: selectedUrl, label: linkLabel });
                }
                setLinkLabel('');
                setIsPopoverOpen(false);
              }}
            >
              Apply
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </>
  );
};
