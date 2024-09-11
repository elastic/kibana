/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiPopover,
  EuiPopoverTitle,
  PopoverAnchorPosition,
  EuiContextMenuItem,
  toSentenceCase,
  EuiHorizontalRule,
  EuiButtonIcon,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { DocLinksStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

export const strings = {
  getSwitchLanguageButtonText: () =>
    i18n.translate('unifiedSearch.switchLanguage.buttonText', {
      defaultMessage: 'Switch language button.',
    }),
};

export interface QueryLanguageSwitcherProps {
  language: string;
  onSelectLanguage: (newLanguage: string) => void;
  anchorPosition?: PopoverAnchorPosition;
  nonKqlMode?: 'lucene' | 'text';
  isOnTopBarMenu?: boolean;
  isDisabled?: boolean;
  deps: {
    docLinks: DocLinksStart;
  };
}

export const QueryLanguageSwitcher = React.memo(function QueryLanguageSwitcher({
  language,
  anchorPosition,
  onSelectLanguage,
  nonKqlMode = 'lucene',
  isOnTopBarMenu,
  isDisabled,
  deps: { docLinks },
}: QueryLanguageSwitcherProps) {
  const kueryQuerySyntaxDocs = docLinks.links.query.kueryQuerySyntax;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const button = (
    <EuiButtonIcon
      size="m"
      iconType="filter"
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      className="kqlQueryBar__languageSwitcherButton"
      data-test-subj={'switchQueryLanguageButton'}
      aria-label={strings.getSwitchLanguageButtonText()}
      disabled={isDisabled}
    />
  );

  const languageMenuItem = (
    <div>
      <EuiContextMenuItem
        key="KQL"
        icon={language === 'kuery' ? 'check' : 'empty'}
        data-test-subj="kqlLanguageMenuItem"
        onClick={() => {
          onSelectLanguage('kuery');
        }}
      >
        KQL
      </EuiContextMenuItem>
      <EuiContextMenuItem
        key={nonKqlMode}
        icon={language === 'kuery' ? 'empty' : 'check'}
        data-test-subj="luceneLanguageMenuItem"
        onClick={() => {
          onSelectLanguage(nonKqlMode);
        }}
      >
        {toSentenceCase(nonKqlMode)}
      </EuiContextMenuItem>
      <EuiHorizontalRule margin="none" />
      <EuiContextMenuItem
        key={'documentation'}
        icon={'documentation'}
        href={kueryQuerySyntaxDocs}
        target="_blank"
      >
        Documentation
      </EuiContextMenuItem>
    </div>
  );

  const languageQueryStringComponent = (
    <EuiPopover
      id="queryLanguageSwitcherPopover"
      anchorPosition={anchorPosition || 'downLeft'}
      button={button}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      repositionOnScroll
      panelPaddingSize="none"
    >
      <EuiPopoverTitle paddingSize="s">
        <FormattedMessage
          id="unifiedSearch.query.queryBar.syntaxOptionsTitle"
          defaultMessage="Syntax options"
        />
      </EuiPopoverTitle>
      {languageMenuItem}
    </EuiPopover>
  );

  return Boolean(isOnTopBarMenu) ? languageMenuItem : languageQueryStringComponent;
});
