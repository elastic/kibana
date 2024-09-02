/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useEffect } from 'react';
import { EuiFlyout, EuiFlyoutBody, EuiButtonIcon, EuiButtonIconProps } from '@elastic/eui';
import {
  type LanguageDocumentationSections,
  LanguageDocumentationPopoverContent,
} from './documentation_content';

interface DocumentationFlyoutProps {
  language: string;
  isHelpMenuOpen: boolean;
  onHelpMenuVisibilityChange: (status: boolean) => void;
  sections?: LanguageDocumentationSections;
  buttonProps?: Omit<EuiButtonIconProps, 'iconType'>;
  searchInDescription?: boolean;
  linkToDocumentation?: string;
}

function DocumentationFlyout({
  language,
  sections,
  buttonProps,
  searchInDescription,
  linkToDocumentation,
  isHelpMenuOpen,
  onHelpMenuVisibilityChange,
}: DocumentationFlyoutProps) {
  const toggleDocumentationFlyout = useCallback(() => {
    onHelpMenuVisibilityChange?.(!isHelpMenuOpen);
  }, [isHelpMenuOpen, onHelpMenuVisibilityChange]);

  useEffect(() => {
    onHelpMenuVisibilityChange(isHelpMenuOpen ?? false);
  }, [isHelpMenuOpen, onHelpMenuVisibilityChange]);

  return (
    <>
      <EuiButtonIcon
        iconType="documentation"
        onClick={toggleDocumentationFlyout}
        {...buttonProps}
      />
      {isHelpMenuOpen && (
        <EuiFlyout
          ownFocus
          onClose={() => onHelpMenuVisibilityChange(false)}
          aria-labelledby="esqlInlineDocumentationFlyout"
          type="push"
        >
          <EuiFlyoutBody>
            <LanguageDocumentationPopoverContent
              language={language}
              sections={sections}
              searchInDescription={searchInDescription}
              linkToDocumentation={linkToDocumentation}
            />
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
}

export const LanguageDocumentationFlyout = React.memo(DocumentationFlyout);
