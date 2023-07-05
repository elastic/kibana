/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

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
} from '@elastic/eui';
import { css } from '@emotion/react';
import { linksService } from '../../services/links_service';
import { NavEmbeddableStrings } from './navigation_embeddable_strings';
import { ILinkFactory, LinkInput } from '../types';
import { EXTERNAL_LINK_EMBEDDABLE_TYPE } from '../../external_link/embeddable/external_link_embeddable_factory';
import { DASHBOARD_LINK_EMBEDDABLE_TYPE } from '../../dashboard_link/embeddable/dashboard_link_embeddable_factory';

type LinkType = typeof DASHBOARD_LINK_EMBEDDABLE_TYPE | typeof EXTERNAL_LINK_EMBEDDABLE_TYPE;

export const NavigationEmbeddableLinkEditor = ({
  onSave,
  onClose,
  currentDashboardId,
}: {
  onClose: (closeBoth: boolean) => void;
  currentDashboardId?: string;
  onSave: (type: string, linkInput: Omit<LinkInput, 'id'>) => void;
}) => {
  // const [linkLabel, setLinkLabel] = useState<string>('');
  const [linkFactory, setLinkFactory] = useState<ILinkFactory | undefined>();
  const [selectedLinkType, setSelectedLinkType] = useState<LinkType>(
    DASHBOARD_LINK_EMBEDDABLE_TYPE
  );
  const [linkInput, setLinkInput] = useState<Partial<LinkInput>>({});
  const [validLink, setValidLink] = useState<boolean>(false);

  const rootRef: React.RefObject<HTMLDivElement> = useMemo(() => React.createRef(), []);

  useEffect(() => {
    const factory = linksService.getLinkFactory(selectedLinkType);
    setLinkFactory(factory);
  }, [selectedLinkType, rootRef]);

  const linkTypes: EuiRadioGroupOption[] = useMemo(() => {
    return linksService.getLinkTypes().map((factoryType) => {
      const factory = linksService.getLinkFactory(factoryType);
      return {
        id: factoryType,
        label: (
          <EuiFlexGroup gutterSize="s" alignItems="center" aria-label={factory.getDescription()}>
            <EuiFlexItem grow={false}>
              <EuiIcon type={factory.getIconType()} color="text" />
            </EuiFlexItem>
            <EuiFlexItem>{factory.getDisplayName()}</EuiFlexItem>
          </EuiFlexGroup>
        ),
      };
    });
  }, []);

  const onChange = useCallback((changes, valid) => {
    setLinkInput(changes);
    setValidLink(valid);
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
                setSelectedLinkType(id as LinkType);
              }}
            />
          </EuiFormRow>

          {linkFactory?.linkEditorComponent && (
            <linkFactory.linkEditorComponent
              currentDashboardId={currentDashboardId}
              onChange={onChange}
            />
          )}
        </EuiForm>
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
              disabled={!linkFactory || !validLink}
              onClick={() => {
                // this check should always be true, since the button is disabled otherwise - this is just for type safety
                if (linkFactory && validLink) {
                  onSave(linkFactory.type, linkInput);
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
