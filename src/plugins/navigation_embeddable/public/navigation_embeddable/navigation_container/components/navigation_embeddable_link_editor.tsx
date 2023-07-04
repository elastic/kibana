/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEmpty } from 'lodash';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  EuiForm,
  EuiIcon,
  EuiButton,
  EuiFormRow,
  EuiFlexItem,
  EuiFieldText,
  EuiFlexGroup,
  EuiRadioGroup,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiRadioGroupOption,
  EuiButtonEmpty,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { NavigationContainerInput } from '../../types';
import { DashboardItem } from '../../dashboard_link/types';
import { NavEmbeddableStrings } from './navigation_embeddable_strings';
import { navigationContainerInputBuilder } from '../editor/navigation_container_input_builder';
import { DashboardLinkEditorDestinationPicker } from '../../dashboard_link/components/dashboard_link_editor_destination_picker';

// TODO: As part of https://github.com/elastic/kibana/issues/154381, replace this regex URL check with more robust url validation
const isValidUrl =
  /^https?:\/\/(?:www.)?[-a-zA-Z0-9@:%._+~#=]{1,256}.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;

type LinkType = 'dashboardLink' | 'externalLink';

export const NavigationEmbeddableLinkEditor = ({
  initialInput,
  onSave,
  onClose,
  currentDashboardId,
}: {
  initialInput: Partial<NavigationContainerInput>;
  onSave: (input: Partial<NavigationContainerInput>) => void;
  onClose: () => void;
  currentDashboardId?: string;
}) => {
  const [linkLabel, setLinkLabel] = useState<string>('');
  const [selectedLinkType, setSelectedLinkType] = useState<LinkType>('dashboardLink');
  const [isDashboardEditorSelected, setIsDashboardEditorSelected] = useState<boolean>(true);

  /** external URL link state */
  const [validUrl, setValidUrl] = useState<boolean>(true);
  const [selectedUrl, setSelectedUrl] = useState<string>();

  /** dashboard link state */
  const [selectedDashboard, setSelectedDashboard] = useState<DashboardItem | undefined>();
  const savedDashboardSelection = useRef<DashboardItem | undefined>(undefined);

  const linkTypes: EuiRadioGroupOption[] = useMemo(() => {
    return [
      {
        label: (
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type={'dashboardApp'} color="text" />
            </EuiFlexItem>
            <EuiFlexItem>{NavEmbeddableStrings.editor.dashboard.getLinkTypeLabel()}</EuiFlexItem>
          </EuiFlexGroup>
        ),
        id: 'dashboardLink' as LinkType,
      },
      {
        label: (
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type={'link'} color="text" />
            </EuiFlexItem>
            <EuiFlexItem>{NavEmbeddableStrings.editor.external.getLinkTypeLabel()}</EuiFlexItem>
          </EuiFlexGroup>
        ),
        id: 'externalLink' as LinkType,
      },
    ];
  }, []);

  useEffect(() => {
    /**
     * A boolean check is faster than comparing strings so, since this is such a common check in this component,
     * storing this value as a boolean is (in theory) marginally more efficient
     */
    setIsDashboardEditorSelected(selectedLinkType === 'dashboardLink');
  }, [selectedLinkType]);

  return (
    <div className={'navEmbeddableEditor'}>
      <EuiFlyoutHeader hasBorder>
        {/* <EuiButtonEmpty iconType={'arrowLeft'} color="text" onClick={onClose}> */}
        <EuiButtonEmpty
          css={css`
            height: auto;
          `}
          flush="left"
          iconType={'arrowLeft'}
          color="text"
          onClick={onClose}
        >
          <EuiTitle size="m">
            <h2>Add link</h2>
          </EuiTitle>
        </EuiButtonEmpty>
        {/* </EuiButtonEmpty> */}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm component="form">
          <EuiFormRow label={NavEmbeddableStrings.editor.getLinkTypePickerLabel()}>
            <EuiRadioGroup
              options={linkTypes}
              idSelected={selectedLinkType}
              onChange={(id) => {
                setSelectedLinkType(id as LinkType);
                if (selectedDashboard) {
                  savedDashboardSelection.current = selectedDashboard;
                }
              }}
            />
          </EuiFormRow>
          <EuiFormRow label={NavEmbeddableStrings.editor.getLinkDestinationLabel()}>
            {isDashboardEditorSelected ? (
              <DashboardLinkEditorDestinationPicker
                currentDashboardId={currentDashboardId}
                setSelectedDashboard={setSelectedDashboard}
              />
            ) : (
              <EuiFieldText
                placeholder={NavEmbeddableStrings.editor.external.getPlaceholder()}
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
          <EuiFormRow label={NavEmbeddableStrings.editor.getLinkTextLabel()}>
            <EuiFieldText
              placeholder={
                isDashboardEditorSelected && selectedDashboard
                  ? selectedDashboard.attributes.title
                  : NavEmbeddableStrings.editor.getLinkTextPlaceholder()
              }
              value={linkLabel}
              onChange={(e) => {
                setLinkLabel(e.target.value);
              }}
            />
          </EuiFormRow>
          {/* TODO: As part of https://github.com/elastic/kibana/issues/154381, we should pull in the custom settings for each link type.
            Refer to `x-pack/examples/ui_actions_enhanced_examples/public/drilldowns/dashboard_to_discover_drilldown/collect_config_container.tsx`
            for the dashboard drilldown settings, for example. 

            Open question: It probably makes sense to re-use these components so any changes made to the drilldown architecture
            trickle down to the navigation embeddable - this would require some refactoring, though. Is this a goal for MVP?
         */}
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              // aria-label={`cancel-${currentInput.title}`}
              data-test-subj="control-editor-cancel"
              iconType="cross"
              onClick={onClose}
            >
              Cancel
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              disabled={
                isDashboardEditorSelected ? !selectedDashboard : !validUrl || isEmpty(selectedUrl)
              }
              onClick={() => {
                if (isDashboardEditorSelected && selectedDashboard) {
                  const { addDashboardLink } = navigationContainerInputBuilder;
                  addDashboardLink(initialInput, {
                    label: linkLabel,
                    dashboardId: selectedDashboard.id,
                  });
                  onSave(initialInput);
                } else if (validUrl && selectedUrl) {
                  const { addExternalLink } = navigationContainerInputBuilder;
                  addExternalLink(initialInput, {
                    label: linkLabel,
                    url: selectedUrl,
                  });
                  onSave(initialInput);
                }
                onClose();
              }}
            >
              Add link
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </div>
  );
};
