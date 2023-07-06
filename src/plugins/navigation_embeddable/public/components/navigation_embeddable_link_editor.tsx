/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';

import {
  EuiForm,
  EuiIcon,
  EuiButton,
  EuiFormRow,
  EuiFlexItem,
  EuiFlexGroup,
  EuiRadioGroup,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiRadioGroupOption,
  EuiButtonEmpty,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFocusTrap,
  EuiFieldText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';
// import { linksService } from '../../services/links_service';
import { NavEmbeddableStrings } from './navigation_embeddable_strings';
import {
  DASHBOARD_LINK_TYPE,
  EXTERNAL_LINK_TYPE,
  NavigationEmbeddableLink,
  NavigationLinkInfo,
  NavigationLinkType,
} from '../embeddable/types';
import { DashboardLinkDestinationPicker } from './dashboard_link/dashboard_link_destination_picker';
import { ExternalLinkDestinationPicker } from './external_link/external_link_destination_picker';

export const NavigationEmbeddableLinkEditor = ({
  onSave,
  onClose,
  parentDashboard,
}: {
  onClose: (closeBoth: boolean) => void;
  onSave: (newLink: NavigationEmbeddableLink) => void;
  parentDashboard?: DashboardContainer;
}) => {
  const [selectedLinkType, setSelectedLinkType] = useState<NavigationLinkType>(DASHBOARD_LINK_TYPE);
  const [linkLabel, setLinkLabel] = useState<string>('');
  const [linkDestination, setLinkDestination] = useState<string | undefined>();

  const linkTypes: EuiRadioGroupOption[] = useMemo(() => {
    return ([DASHBOARD_LINK_TYPE, EXTERNAL_LINK_TYPE] as NavigationLinkType[]).map((type) => {
      return {
        id: type,
        label: (
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            aria-label={NavigationLinkInfo[type].description}
          >
            <EuiFlexItem grow={false}>
              <EuiIcon type={NavigationLinkInfo[type].icon} color="text" />
            </EuiFlexItem>
            <EuiFlexItem>{NavigationLinkInfo[type].displayName}</EuiFlexItem>
          </EuiFlexGroup>
        ),
      };
    });
  }, []);

  return (
    <EuiFocusTrap className={'navEmbeddableLinkEditor'}>
      <EuiFlyoutHeader hasBorder>
        <EuiButtonEmpty
          css={css`
            height: auto;
          `}
          flush="left"
          color="text"
          iconType={'arrowLeft'}
          onClick={() => onClose(false)}
        >
          <EuiTitle size="m" aria-label="Go back to panel editor">
            <h2>{NavEmbeddableStrings.editor.getAddButtonLabel()}</h2>
          </EuiTitle>
        </EuiButtonEmpty>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm component="form">
          <EuiFormRow label={NavEmbeddableStrings.editor.linkEditor.getLinkTypePickerLabel()}>
            <EuiRadioGroup
              options={linkTypes}
              idSelected={selectedLinkType}
              onChange={(id) => {
                setSelectedLinkType(id as NavigationLinkType);
              }}
            />
          </EuiFormRow>

          <EuiFormRow label={NavEmbeddableStrings.editor.linkEditor.getLinkDestinationLabel()}>
            {selectedLinkType === DASHBOARD_LINK_TYPE ? (
              <DashboardLinkDestinationPicker
                setDestination={setLinkDestination}
                currentDestination={linkDestination}
                parentDashboard={parentDashboard}
              />
            ) : (
              <ExternalLinkDestinationPicker
                setDestination={setLinkDestination}
                currentDestination={linkDestination}
              />
            )}
          </EuiFormRow>

          <EuiFormRow label={NavEmbeddableStrings.editor.linkEditor.getLinkTextLabel()}>
            <EuiFieldText
              placeholder={NavEmbeddableStrings.editor.linkEditor.getLinkTextPlaceholder()}
              value={linkLabel}
              onChange={(e) => {
                setLinkLabel(e.target.value);
              }}
            />
          </EuiFormRow>
        </EuiForm>

        {/* TODO: As part of https://github.com/elastic/kibana/issues/154381, we should pull in the custom settings for each link type.
            Refer to `x-pack/examples/ui_actions_enhanced_examples/public/drilldowns/dashboard_to_discover_drilldown/collect_config_container.tsx`
            for the dashboard drilldown settings, for example. 

            Open question: It probably makes sense to re-use these components so any changes made to the drilldown architecture
            trickle down to the navigation embeddable - this would require some refactoring, though. Is this a goal for MVP?
         */}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={() => onClose(true)}>
              {NavEmbeddableStrings.editor.getCancelButtonLabel()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              disabled={!linkDestination}
              onClick={() => {
                // this check should always be true, since the button is disabled otherwise - this is just for type safety
                if (linkDestination) {
                  onSave({
                    destination: linkDestination,
                    label: linkLabel,
                    type: selectedLinkType,
                  });
                  onClose(false);
                }
              }}
            >
              {NavEmbeddableStrings.editor.getAddButtonLabel()}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFocusTrap>
  );
};
