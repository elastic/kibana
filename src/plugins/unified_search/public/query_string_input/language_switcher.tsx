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
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useKibana } from '../../../kibana_react/public';

export interface QueryLanguageSwitcherProps {
  language: string;
  onSelectLanguage: (newLanguage: string) => void;
  anchorPosition?: PopoverAnchorPosition;
  nonKqlMode?: 'lucene' | 'text';
  isOnMenu?: boolean;
}

export const QueryLanguageSwitcher = React.memo(function QueryLanguageSwitcher({
  language,
  anchorPosition,
  onSelectLanguage,
  nonKqlMode = 'lucene',
  isOnMenu,
}: QueryLanguageSwitcherProps) {
  const kibana = useKibana();
  const kueryQuerySyntaxDocs = kibana.services.docLinks!.links.query.kueryQuerySyntax;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const button = (
    <EuiButtonIcon
      size="m"
      display="base"
      iconType="filter"
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      className="euiFormControlLayout__append kqlQueryBar__languageSwitcherButton"
      data-test-subj={'switchQueryLanguageButton'}
      aria-label={i18n.translate('unifiedSearch.switchLanguage.buttonText', {
        defaultMessage: 'Switch language button.',
      })}
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
          setIsPopoverOpen(false);
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
          setIsPopoverOpen(false);
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

  return Boolean(isOnMenu) ? languageMenuItem : languageQueryStringComponent;
});
