/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { getFieldValue } from '@kbn/discover-utils';
import {
  EuiAccordion,
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  htmlIdGenerator,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DocumentProfileProvider, DocumentType } from '../../../profiles';

export const createSecurityDocumentProfileProvider = (): DocumentProfileProvider => ({
  profileId: 'security-document-profile',
  profile: {
    getDocViewer: (prev) => (params) => {
      const prevDocViewer = prev(params);

      const description = getFieldValue(params.record, 'kibana.alert.rule.description');
      const reason = getFieldValue(params.record, 'kibana.alert.reason');
      const note = getFieldValue(params.record, 'kibana.alert.rule.note');
      const alertURl = getFieldValue(params.record, 'kibana.alert.url');

      return {
        ...prevDocViewer,
        docViewsRegistry: (registry) => {
          registry.add({
            id: 'doc_view_alerts_overview',
            title: 'Alert Overview',
            order: 0,
            component: (props) => {
              return (
                <EuiFlexGroup gutterSize="m" direction="column" style={{ paddingBlock: '20px' }}>
                  <EuiFlexItem>
                    <ExpandableSection title={'About'}>
                      <EuiText>{description}</EuiText>
                    </ExpandableSection>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <ExpandableSection title={'Reason'}>
                      <EuiText>{reason}</EuiText>
                    </ExpandableSection>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <ExpandableSection title={'Investigation Guide'}>
                      <EuiCallOut
                        iconType="documentation"
                        size="s"
                        title={
                          <FormattedMessage
                            id="xpack.securitySolution.flyout.right.investigation.investigationGuide.previewTitle"
                            defaultMessage="Investigation guide"
                          />
                        }
                        aria-label={i18n.translate(
                          'xpack.securitySolution.flyout.right.investigation.investigationGuide.previewAriaLabel',
                          { defaultMessage: 'Investigation guide' }
                        )}
                      >
                        <FormattedMessage
                          id="xpack.securitySolution.flyout.right.investigation.investigationGuide.previewMessage"
                          defaultMessage="Investigation guide is not available in alert preview."
                        />
                      </EuiCallOut>
                    </ExpandableSection>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      href={alertURl}
                      target="_blank"
                      iconType="link"
                      fill
                      aria-label="Open in Security"
                    >
                      Open in Security
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              );
            },
          });

          return prevDocViewer.docViewsRegistry(registry);
        },
      };
    },
  },
  resolve: (params) => {
    if (getFieldValue(params.record, 'event.kind') !== 'signal') {
      console.log('Not - Security Document Profile matched');
      return { isMatch: false };
    }

    console.log('Security Document Profile matched');

    return {
      isMatch: true,
      context: {
        type: DocumentType.Alert,
      },
    };
  },
});
const idPrefix = htmlIdGenerator()();
function ExpandableSection({ title, children }) {
  const [trigger, setTrigger] = useState('open');

  const onToggle = (isOpen) => {
    const newState = isOpen ? 'open' : 'closed';
    setTrigger(newState);
    setID(`${idPrefix}--${newState}`);
  };

  return (
    <EuiAccordion
      id={`accordion-1`}
      forceState={trigger}
      onToggle={onToggle}
      buttonContent={
        <EuiTitle size="xs" data-test-subj={'about-header'}>
          <h4>{title}</h4>
        </EuiTitle>
      }
    >
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize={'m'} direction="column" data-test-subj={'discover-content'}>
        {children}
      </EuiFlexGroup>
    </EuiAccordion>
  );
}
