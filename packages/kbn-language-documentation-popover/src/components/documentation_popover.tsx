/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiPopover,
  EuiToolTip,
  EuiButtonIcon,
  EuiButtonIconProps,
  EuiOutsideClickDetector,
} from '@elastic/eui';
import {
  type LanguageDocumentationSections,
  LanguageDocumentationPopoverContent,
} from './documentation_content';

interface DocumentationPopoverProps {
  language: string;
  isHelpMenuOpen: boolean;
  setIsHelpMenuOpen: (status: boolean) => void;
  sections?: LanguageDocumentationSections;
  buttonProps?: Omit<EuiButtonIconProps, 'iconType'>;
  searchInDescription?: boolean;
  linkToDocumentation?: string;
}

function DocumentationPopover({
  language,
  sections,
  buttonProps,
  searchInDescription,
  linkToDocumentation,
  isHelpMenuOpen,
  setIsHelpMenuOpen,
}: DocumentationPopoverProps) {
  const toggleDocumentationPopover = useCallback(() => {
    setIsHelpMenuOpen?.(!isHelpMenuOpen);
  }, [isHelpMenuOpen, setIsHelpMenuOpen]);

  useEffect(() => {
    setIsHelpMenuOpen(isHelpMenuOpen ?? false);
  }, [isHelpMenuOpen, setIsHelpMenuOpen]);

  return (
    <EuiOutsideClickDetector
      onOutsideClick={() => {
        setIsHelpMenuOpen?.(false);
      }}
    >
      <EuiPopover
        panelClassName="documentation__docs--overlay"
        panelPaddingSize="none"
        isOpen={isHelpMenuOpen}
        closePopover={() => setIsHelpMenuOpen(false)}
        button={
          <EuiToolTip
            position="top"
            content={i18n.translate('languageDocumentationPopover.tooltip', {
              defaultMessage: '{lang} reference',
              values: {
                lang: language,
              },
            })}
          >
            <EuiButtonIcon
              iconType="documentation"
              onClick={toggleDocumentationPopover}
              {...buttonProps}
            />
          </EuiToolTip>
        }
      >
        <LanguageDocumentationPopoverContent
          language={language}
          sections={sections}
          searchInDescription={searchInDescription}
          linkToDocumentation={linkToDocumentation}
        />
      </EuiPopover>
    </EuiOutsideClickDetector>
  );
}

export const LanguageDocumentationPopover = React.memo(DocumentationPopover);
