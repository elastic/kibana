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
  LinksLinkType,
  EXTERNAL_LINK_TYPE,
  DASHBOARD_LINK_TYPE,
  LinksLinkOptions,
  LinksLink,
} from '../../../common/content_management';
import { LinksLinkInfo } from '../../embeddable/types';
import { LinksStrings } from '../links_strings';
import { LinksUnorderedLink } from '../../editor/open_link_editor_flyout';
import { LinksLinkOptionsComponent } from './links_link_options';
import { LinksLinkDestination } from './links_link_destination';

export const LinksLinkEditor = ({
  link,
  onSave,
  onClose,
  parentDashboard,
}: {
  onClose: () => void;
  parentDashboard?: DashboardContainer;
  link?: LinksUnorderedLink; // will only be defined if **editing** a link; otherwise, creating a new link
  onSave: (newLink: Omit<LinksLink, 'order'>) => void;
}) => {
  const [selectedLinkType, setSelectedLinkType] = useState<LinksLinkType>(
    link?.type ?? DASHBOARD_LINK_TYPE
  );
  const [defaultLinkLabel, setDefaultLinkLabel] = useState<string | undefined>();
  const [currentLinkLabel, setCurrentLinkLabel] = useState<string>(link?.label ?? '');
  const [linkOptions, setLinkOptions] = useState<LinksLinkOptions | undefined>();
  const [linkDestination, setLinkDestination] = useState<string | undefined>(link?.destination);

  const linkTypes: EuiRadioGroupOption[] = useMemo(() => {
    return ([DASHBOARD_LINK_TYPE, EXTERNAL_LINK_TYPE] as LinksLinkType[]).map((type) => {
      return {
        id: type,
        label: (
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            aria-label={LinksLinkInfo[type].description}
          >
            <EuiFlexItem grow={false}>
              <EuiIcon type={LinksLinkInfo[type].icon} color="text" />
            </EuiFlexItem>
            <EuiFlexItem>{LinksLinkInfo[type].displayName}</EuiFlexItem>
          </EuiFlexGroup>
        ),
      };
    });
  }, []);

  /** When a new destination is picked, handle the logic for what to display as the current + default labels */
  const handleDestinationPicked = useCallback(
    (destination?: string, label?: string) => {
      setLinkDestination(destination);
      if (!currentLinkLabel || defaultLinkLabel === currentLinkLabel) {
        setCurrentLinkLabel(label ?? '');
      }
      setDefaultLinkLabel(label);
    },
    [defaultLinkLabel, currentLinkLabel]
  );

  return (
    <EuiFocusTrap className={'linksLinkEditor in'}>
      <EuiFlyoutHeader hasBorder>
        <EuiButtonEmpty
          className="linkEditorBackButton"
          flush="left"
          color="text"
          iconType={'arrowLeft'}
          onClick={() => onClose()}
        >
          <EuiTitle size="m" aria-label={LinksStrings.editor.linkEditor.getGoBackAriaLabel()}>
            <h2>
              {link
                ? LinksStrings.editor.getEditLinkTitle()
                : LinksStrings.editor.getAddButtonLabel()}
            </h2>
          </EuiTitle>
        </EuiButtonEmpty>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm component="form" fullWidth>
          <EuiFormRow label={LinksStrings.editor.linkEditor.getLinkTypePickerLabel()}>
            <EuiRadioGroup
              options={linkTypes}
              idSelected={selectedLinkType}
              onChange={(id) => {
                if (currentLinkLabel === defaultLinkLabel) {
                  setCurrentLinkLabel(link?.type === id ? link.label ?? '' : '');
                }
                setSelectedLinkType(id as LinksLinkType);
              }}
            />
          </EuiFormRow>
          <LinksLinkDestination
            link={link}
            parentDashboard={parentDashboard}
            selectedLinkType={selectedLinkType}
            setDestination={handleDestinationPicked}
          />
          <EuiFormRow label={LinksStrings.editor.linkEditor.getLinkTextLabel()}>
            <EuiFieldText
              placeholder={
                (linkDestination ? defaultLinkLabel : '') ||
                LinksStrings.editor.linkEditor.getLinkTextPlaceholder()
              }
              value={currentLinkLabel}
              onChange={(e) => setCurrentLinkLabel(e.target.value)}
            />
          </EuiFormRow>
          <LinksLinkOptionsComponent
            link={link}
            setLinkOptions={setLinkOptions}
            selectedLinkType={selectedLinkType}
          />
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={() => onClose()} iconType="cross">
              {LinksStrings.editor.getCancelButtonLabel()}
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
                    options: linkOptions,
                  });

                  onClose();
                }
              }}
            >
              {link
                ? LinksStrings.editor.getUpdateButtonLabel()
                : LinksStrings.editor.getAddButtonLabel()}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFocusTrap>
  );
};
