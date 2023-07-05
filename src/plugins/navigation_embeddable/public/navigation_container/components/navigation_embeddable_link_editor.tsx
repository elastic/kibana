/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useState } from 'react';

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
import { linksService } from '../../services/links_service';
import { NavEmbeddableStrings } from './navigation_embeddable_strings';
import { ILinkFactory } from '../types';
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
  onSave: (type: string, destination: string, label?: string) => void;
}) => {
  const [linkLabel, setLinkLabel] = useState<string>('');
  const [linkFactory, setLinkFactory] = useState<ILinkFactory | undefined>();

  const [selectedLinkType, setSelectedLinkType] = useState<LinkType>(
    DASHBOARD_LINK_EMBEDDABLE_TYPE
  );

  const [destination, setDestination] = useState<string | undefined>();
  const [placeholder, setPlaceholder] = useState<string | undefined>();

  useEffect(() => {
    const factory = linksService.getLinkFactory(selectedLinkType);
    setLinkFactory(factory);
  }, [selectedLinkType]);

  const linkTypes: EuiRadioGroupOption[] = useMemo(() => {
    return linksService.getLinkTypes().map((factoryType) => {
      const factory = linksService.getLinkFactory(factoryType);
      return {
        id: factoryType,
        label: (
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type={factory.getIconType()} color="text" />
            </EuiFlexItem>
            <EuiFlexItem>{factory.getDisplayName()}</EuiFlexItem>
          </EuiFlexGroup>
        ),
      };
    });
  }, []);

  return (
    <div className={'navEmbeddableEditor'}>
      <EuiFlyoutHeader hasBorder>
        <EuiButtonEmpty
          css={css`
            height: auto;
          `}
          flush="left"
          iconType={'arrowLeft'}
          color="text"
          onClick={() => onClose(false)}
        >
          <EuiTitle size="m">
            <h2>Add link</h2>
          </EuiTitle>
        </EuiButtonEmpty>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm component="form">
          <EuiFormRow label={NavEmbeddableStrings.editor.getLinkTypePickerLabel()}>
            <EuiRadioGroup
              options={linkTypes}
              idSelected={selectedLinkType}
              onChange={(id) => {
                setSelectedLinkType(id as LinkType);
              }}
            />
          </EuiFormRow>
          <EuiFormRow label={NavEmbeddableStrings.editor.getLinkDestinationLabel()}>
            {linkFactory?.linkEditorDestinationComponent ? (
              <linkFactory.linkEditorDestinationComponent
                setDestination={setDestination}
                setPlaceholder={setPlaceholder}
                currentDashboardId={currentDashboardId}
              />
            ) : (
              <></>
            )}
          </EuiFormRow>
          <EuiFormRow label={NavEmbeddableStrings.editor.getLinkTextLabel()}>
            <EuiFieldText
              placeholder={placeholder || NavEmbeddableStrings.editor.getLinkTextPlaceholder()}
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
              onClick={() => onClose(true)}
            >
              Cancel
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              disabled={!linkFactory || !destination}
              onClick={() => {
                // this check should always be true, since the button is disabled otherwise - this is just for type safety
                if (linkFactory && destination) {
                  onSave(linkFactory.type, destination, linkLabel);
                  onClose(false);
                }
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
