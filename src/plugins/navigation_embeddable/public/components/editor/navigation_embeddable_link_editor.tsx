/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 as uuidv4 } from 'uuid';
import React, { useCallback, useMemo, useState } from 'react';

import {
  EuiForm,
  EuiIcon,
  EuiTitle,
  EuiButton,
  EuiFormRow,
  EuiFlexItem,
  EuiFieldText,
  EuiFocusTrap,
  EuiFlexGroup,
  EuiRadioGroup,
  EuiFlyoutBody,
  EuiButtonEmpty,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiRadioGroupOption,
} from '@elastic/eui';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';

import {
  NavigationLinkType,
  EXTERNAL_LINK_TYPE,
  DASHBOARD_LINK_TYPE,
  NavigationEmbeddableLink,
} from '../../../common/content_management';
import { NavEmbeddableStrings } from '../navigation_embeddable_strings';
import { DashboardItem, NavigationLinkInfo } from '../../embeddable/types';
import { NavigationEmbeddableUnorderedLink } from '../../editor/open_link_editor_flyout';
import { ExternalLinkDestinationPicker } from '../external_link/external_link_destination_picker';
import { DashboardLinkDestinationPicker } from '../dashboard_link/dashboard_link_destination_picker';

export const NavigationEmbeddableLinkEditor = ({
  link,
  onSave,
  onClose,
  parentDashboard,
}: {
  onClose: () => void;
  parentDashboard?: DashboardContainer;
  link?: NavigationEmbeddableUnorderedLink; // will only be defined if **editing** a link; otherwise, creating a new link
  onSave: (newLink: Omit<NavigationEmbeddableLink, 'order'>) => void;
}) => {
  const [selectedLinkType, setSelectedLinkType] = useState<NavigationLinkType>(
    link?.type ?? DASHBOARD_LINK_TYPE
  );
  const [defaultLinkLabel, setDefaultLinkLabel] = useState<string | undefined>();
  const [currentLinkLabel, setCurrentLinkLabel] = useState<string>(link?.label ?? '');
  const [linkDestination, setLinkDestination] = useState<string | undefined>(link?.destination);

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

  const onDashboardSelected = useCallback(
    (selectedDashboard?: DashboardItem) => {
      setLinkDestination(selectedDashboard?.id);
      if (selectedDashboard) {
        const dashboardTitle = selectedDashboard.attributes.title;
        setDefaultLinkLabel(dashboardTitle);
        if (!currentLinkLabel || currentLinkLabel === defaultLinkLabel) {
          setCurrentLinkLabel(dashboardTitle);
        }
      }
    },
    [currentLinkLabel, defaultLinkLabel]
  );

  const onUrlSelected = useCallback(
    (url?: string) => {
      setLinkDestination(url);
      if (url) {
        setDefaultLinkLabel(url);
        if (!currentLinkLabel || currentLinkLabel === defaultLinkLabel) {
          setCurrentLinkLabel(url);
        }
      }
    },
    [currentLinkLabel, defaultLinkLabel]
  );

  return (
    <EuiFocusTrap className={'navEmbeddableLinkEditor in'}>
      <EuiFlyoutHeader hasBorder>
        <EuiButtonEmpty
          className="linkEditorBackButton"
          flush="left"
          color="text"
          iconType={'arrowLeft'}
          onClick={() => onClose()}
        >
          <EuiTitle
            size="m"
            aria-label={NavEmbeddableStrings.editor.linkEditor.getGoBackAriaLabel()}
          >
            <h2>
              {link
                ? NavEmbeddableStrings.editor.getEditLinkTitle()
                : NavEmbeddableStrings.editor.getAddButtonLabel()}
            </h2>
          </EuiTitle>
        </EuiButtonEmpty>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm component="form" fullWidth>
          <EuiFormRow label={NavEmbeddableStrings.editor.linkEditor.getLinkTypePickerLabel()}>
            <EuiRadioGroup
              options={linkTypes}
              idSelected={selectedLinkType}
              onChange={(id) => {
                if (link?.type === id) {
                  setLinkDestination(link.destination);
                  setCurrentLinkLabel(link.label ?? '');
                } else {
                  setLinkDestination(undefined);
                  setCurrentLinkLabel('');
                }
                setDefaultLinkLabel(undefined);
                setSelectedLinkType(id as NavigationLinkType);
              }}
            />
          </EuiFormRow>

          <EuiFormRow label={NavEmbeddableStrings.editor.linkEditor.getLinkDestinationLabel()}>
            {selectedLinkType === DASHBOARD_LINK_TYPE ? (
              <DashboardLinkDestinationPicker
                parentDashboard={parentDashboard}
                initialSelection={linkDestination}
                onDestinationPicked={onDashboardSelected}
              />
            ) : (
              <ExternalLinkDestinationPicker
                initialSelection={linkDestination}
                onDestinationPicked={onUrlSelected}
              />
            )}
          </EuiFormRow>

          <EuiFormRow label={NavEmbeddableStrings.editor.linkEditor.getLinkTextLabel()}>
            <EuiFieldText
              placeholder={
                (linkDestination ? defaultLinkLabel : '') ||
                NavEmbeddableStrings.editor.linkEditor.getLinkTextPlaceholder()
              }
              value={currentLinkLabel}
              onChange={(e) => setCurrentLinkLabel(e.target.value)}
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
            <EuiButtonEmpty onClick={() => onClose()} iconType="cross">
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
                    label: currentLinkLabel === defaultLinkLabel ? undefined : currentLinkLabel,
                    type: selectedLinkType,
                    id: link?.id ?? uuidv4(),
                    destination: linkDestination,
                  });

                  onClose();
                }
              }}
            >
              {link
                ? NavEmbeddableStrings.editor.getUpdateButtonLabel()
                : NavEmbeddableStrings.editor.getAddButtonLabel()}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFocusTrap>
  );
};
