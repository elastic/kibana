/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

import {
  LinkType,
  EXTERNAL_LINK_TYPE,
  DASHBOARD_LINK_TYPE,
  LinkOptions,
} from '../../../common/content_management';
import { LinksStrings } from '../links_strings';
import { LinkInfo } from './constants';
import { LinkOptionsComponent } from './link_options';
import { UnorderedLink } from '../../editor/open_link_editor_flyout';
import { LinkDestination } from './link_destination';

export const LinkEditor = ({
  link,
  onSave,
  onClose,
  parentDashboardId,
}: {
  onClose: () => void;
  parentDashboardId?: string;
  link?: UnorderedLink; // will only be defined if **editing** a link; otherwise, creating a new link
  onSave: (newLink: UnorderedLink) => void;
}) => {
  const [selectedLinkType, setSelectedLinkType] = useState<LinkType>(
    link?.type ?? DASHBOARD_LINK_TYPE
  );
  const [defaultLinkLabel, setDefaultLinkLabel] = useState<string | undefined>(link?.title);
  const [currentLinkLabel, setCurrentLinkLabel] = useState<string>(link?.label ?? '');
  const [linkDescription, setLinkDescription] = useState<string | undefined>(link?.description);
  const [linkOptions, setLinkOptions] = useState<LinkOptions | undefined>(link?.options);
  const [linkDestination, setLinkDestination] = useState<string | undefined>(link?.destination);

  const linkTypes: EuiRadioGroupOption[] = useMemo(() => {
    return ([DASHBOARD_LINK_TYPE, EXTERNAL_LINK_TYPE] as LinkType[]).map((type) => {
      return {
        id: type,
        label: (
          <EuiFlexGroup gutterSize="s" alignItems="center" aria-label={LinkInfo[type].description}>
            <EuiFlexItem grow={false}>
              <EuiIcon type={LinkInfo[type].icon} color="text" />
            </EuiFlexItem>
            <EuiFlexItem>{LinkInfo[type].displayName}</EuiFlexItem>
          </EuiFlexGroup>
        ),
        'data-test-subj': `links--linkEditor--${type}--radioBtn`,
      };
    });
  }, []);

  /** When a new destination is picked, handle the logic for what to display as the current + default labels */
  const handleDestinationPicked = useCallback(
    (destination?: string, label?: string, description?: string) => {
      setLinkDestination(destination);
      if (!currentLinkLabel || defaultLinkLabel === currentLinkLabel) {
        setCurrentLinkLabel(label ?? '');
      }
      setDefaultLinkLabel(label);
      setLinkDescription(description);
    },
    [defaultLinkLabel, currentLinkLabel]
  );

  return (
    <EuiFocusTrap className={'linkEditor in'}>
      <EuiFlyoutHeader hasBorder>
        <EuiButtonEmpty
          className="linkEditorBackButton"
          flush="left"
          color="text"
          iconType={'arrowLeft'}
          onClick={() => onClose()}
        >
          <EuiTitle size="s" aria-label={LinksStrings.editor.linkEditor.getGoBackAriaLabel()}>
            <h2>
              {link
                ? LinksStrings.editor.getEditLinkTitle()
                : LinksStrings.editor.getAddButtonLabel()}
            </h2>
          </EuiTitle>
        </EuiButtonEmpty>
      </EuiFlyoutHeader>
      <EuiFlyoutBody data-test-subj="links--linkEditor--flyout">
        <EuiForm component="form" fullWidth>
          <EuiFormRow label={LinksStrings.editor.linkEditor.getLinkTypePickerLabel()}>
            <EuiRadioGroup
              compressed
              options={linkTypes}
              idSelected={selectedLinkType}
              onChange={(id) => {
                if (currentLinkLabel === defaultLinkLabel) {
                  setCurrentLinkLabel(link?.type === id ? link.label ?? '' : '');
                }
                setSelectedLinkType(id as LinkType);
              }}
            />
          </EuiFormRow>
          <LinkDestination
            link={link}
            parentDashboardId={parentDashboardId}
            selectedLinkType={selectedLinkType}
            setDestination={handleDestinationPicked}
          />
          <EuiFormRow label={LinksStrings.editor.linkEditor.getLinkTextLabel()}>
            <EuiFieldText
              compressed
              placeholder={
                (linkDestination ? defaultLinkLabel : '') ||
                LinksStrings.editor.linkEditor.getLinkTextPlaceholder()
              }
              value={currentLinkLabel}
              onChange={(e) => setCurrentLinkLabel(e.target.value)}
              data-test-subj="links--linkEditor--linkLabel--input"
            />
          </EuiFormRow>
          <LinkOptionsComponent
            link={link}
            setLinkOptions={setLinkOptions}
            selectedLinkType={selectedLinkType}
          />
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              flush="left"
              onClick={() => onClose()}
              data-test-subj="links--linkEditor--closeBtn"
            >
              {LinksStrings.editor.getCancelButtonLabel()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
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
                    title: defaultLinkLabel ?? '',
                    description: linkDescription,
                  });

                  onClose();
                }
              }}
              data-test-subj="links--linkEditor--saveBtn"
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
