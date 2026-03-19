/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiFlexGroup, EuiLink, EuiText } from '@elastic/eui';

import {
  PanelContainer,
  PanelHeader,
  PanelBody,
  PanelBodySection,
  PanelBodySectionInfo,
  SubPanelHeading,
} from '../date_range_picker_panel_ui';
import { documentationPanelTexts } from '../translations';

// TODO add real URL
const DETAILED_DOCS_URL = 'https://www.elastic.co/';

const Content = () => (
  <EuiFlexGroup gutterSize="m" direction="column">
    <PanelBodySectionInfo markdown={documentationPanelTexts.intro} />
    <PanelBodySectionInfo
      heading={documentationPanelTexts.absoluteHeading}
      markdown={documentationPanelTexts.absoluteBody}
    />
    <PanelBodySectionInfo
      heading={documentationPanelTexts.relativeHeading}
      markdown={documentationPanelTexts.relativeBody}
    />
    <PanelBodySectionInfo
      heading={documentationPanelTexts.combinationsHeading}
      markdown={documentationPanelTexts.combinationsBody}
    />
    <EuiText size="s">
      <EuiLink href={DETAILED_DOCS_URL} target="_blank" external>
        {documentationPanelTexts.detailedDocumentationLink}
      </EuiLink>
    </EuiText>
  </EuiFlexGroup>
);

/**
 * A panel for end-user documention about the component.
 */
export function DocumentationPanel() {
  return (
    <PanelContainer>
      <PanelHeader>
        <SubPanelHeading>{documentationPanelTexts.heading}</SubPanelHeading>
      </PanelHeader>
      <PanelBody spacingSide="both">
        <PanelBodySection>
          <Content />
        </PanelBodySection>
      </PanelBody>
    </PanelContainer>
  );
}
DocumentationPanel.PANEL_ID = 'documentation-panel';
