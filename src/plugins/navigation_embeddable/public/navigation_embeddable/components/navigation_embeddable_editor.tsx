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
  EuiFormRow,
  EuiFlexItem,
  EuiFieldText,
  EuiFlexGroup,
  EuiRadioGroup,
  EuiButtonEmpty,
  EuiPopoverFooter,
  EuiRadioGroupOption,
  EuiWrappingPopover,
} from '@elastic/eui';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';

import { DashboardItem, DashboardLink, ExternalLink, isDashboardLink } from '../types';
import { NavEmbeddableStrings } from './navigation_embeddable_strings';
import {
  NavigationEmbeddable,
  NavigationEmbeddableContext,
  useNavigationEmbeddable,
} from '../embeddable/navigation_embeddable';
import { NavigationEmbeddableDashboardList } from './navigation_embeddable_dashboard_list';
import { coreServices } from '../services/navigation_embeddable_services';

// TODO: As part of https://github.com/elastic/kibana/issues/154381, replace this regex URL check with more robust url validation
const isValidUrl =
  /^https?:\/\/(?:www.)?[-a-zA-Z0-9@:%._+~#=]{1,256}.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;

type LinkType = 'dashboardLink' | 'externalLink';

export const NAV_EMBEDDABLE_POPOVER_WIDTH = 400;

export const EditPopover = ({
  linkIndex,
  anchor,
  closePopover,
  embeddable,
}: {
  linkIndex: number;
  anchor: HTMLElement;
  closePopover: () => void;
  embeddable: NavigationEmbeddable;
}) => {
  const links = embeddable.select((state) => state.componentState.links);
  const editingLink = links ? links[linkIndex] : undefined;
  console.log('editinglink', editingLink);

  return (
    <EuiWrappingPopover
      isOpen={true}
      anchorPosition={'upLeft'} // has to be `upLeft` or the popover jumps when width is set ¯\_(ツ)_/¯
      button={anchor}
      panelStyle={{ width: NAV_EMBEDDABLE_POPOVER_WIDTH }}
      closePopover={closePopover}
    >
      <KibanaThemeProvider theme$={coreServices.theme.theme$}>
        <NavigationEmbeddableContext.Provider value={embeddable}>
          <NavigationEmbeddableEditor closePopover={closePopover} editingLink={editingLink} />
        </NavigationEmbeddableContext.Provider>
      </KibanaThemeProvider>
    </EuiWrappingPopover>
  );
};

export const NavigationEmbeddableEditor = ({
  closePopover,
  editingLink,
}: {
  closePopover: () => void;
  editingLink?: DashboardLink | ExternalLink;
}) => {
  const navEmbeddable = useNavigationEmbeddable();

  const [linkLabel, setLinkLabel] = useState<string>(editingLink?.label ?? '');

  const [selectedLinkType, setSelectedLinkType] = useState<LinkType>(
    !editingLink || isDashboardLink(editingLink) ? 'dashboardLink' : 'externalLink'
  );

  /** external URL link state */
  const [validUrl, setValidUrl] = useState<boolean>(true);
  const [selectedUrl, setSelectedUrl] = useState<string>(
    isDashboardLink(editingLink) ? '' : editingLink?.url ?? ''
  );

  /** dashboard link state */
  const [selectedDashboard, setSelectedDashboard] = useState<DashboardItem | undefined>();
  const savedDashboardSelectionId = useRef<string | undefined>(
    isDashboardLink(editingLink) ? editingLink.id : undefined
  );

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

  return (
    <>
      <EuiForm component="form">
        <EuiFormRow label={NavEmbeddableStrings.editor.getLinkTypePickerLabel()}>
          <EuiRadioGroup
            options={linkTypes}
            idSelected={selectedLinkType}
            onChange={(id) => {
              setSelectedLinkType(id as LinkType);
              if (selectedDashboard) {
                savedDashboardSelectionId.current = selectedDashboard.id;
              }
            }}
          />
        </EuiFormRow>
        <EuiFormRow label={NavEmbeddableStrings.editor.getLinkDestinationLabel()}>
          {selectedLinkType === 'dashboardLink' ? (
            <NavigationEmbeddableDashboardList
              initialSelectionId={savedDashboardSelectionId.current}
              onDashboardSelected={setSelectedDashboard}
            />
          ) : (
            <EuiFieldText
              placeholder={NavEmbeddableStrings.editor.external.getPlaceholder()}
              isInvalid={!validUrl}
              value={selectedUrl}
              onChange={(e) => {
                const url = e.target.value;
                setSelectedUrl(url);
                setValidUrl(isValidUrl.test(url));
              }}
            />
          )}
        </EuiFormRow>
        <EuiFormRow label={NavEmbeddableStrings.editor.getLinkTextLabel()}>
          <EuiFieldText
            placeholder={
              selectedDashboard
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
      <EuiPopoverFooter className="navEmbeddable-editorFooter">
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              disabled={
                selectedLinkType === 'dashboardLink'
                  ? !selectedDashboard
                  : !validUrl || isEmpty(selectedUrl)
              }
              onClick={() => {
                if (isDashboardLink(selectedDashboard)) {
                  navEmbeddable.dispatch.addDashboardLink({
                    label: linkLabel,
                    id: selectedDashboard.id,
                    title: selectedDashboard.attributes.title,
                    description: selectedDashboard.attributes.description,
                  });
                } else if (validUrl && selectedUrl) {
                  navEmbeddable.dispatch.addExternalLink({ url: selectedUrl, label: linkLabel });
                }
                setLinkLabel('');
                closePopover();
              }}
            >
              {NavEmbeddableStrings.editor.getApplyButtonLabel()}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </>
  );
};
