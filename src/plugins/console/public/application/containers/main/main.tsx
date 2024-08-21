/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiPageTemplate,
  EuiSplitPanel,
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiButtonEmpty,
} from '@elastic/eui';
import { Editor } from '../editor';
import { TopNavMenu, SomethingWentWrongCallout } from '../../components';
import { useDataInit } from '../../hooks';
import { getTopNavConfig } from './get_top_nav';
import { SHELL_TAB_ID } from './tab_ids';

interface MainProps {
  isEmbeddable?: boolean;
}

export function Main({ isEmbeddable = false }: MainProps) {
  const [selectedTab, setSelectedTab] = useState(SHELL_TAB_ID);

  const { done, error, retry } = useDataInit();

  if (error) {
    return (
      <EuiPageTemplate.EmptyPrompt color="danger">
        <SomethingWentWrongCallout onButtonClick={retry} error={error} />
      </EuiPageTemplate.EmptyPrompt>
    );
  }

  return (
    <div id="consoleRoot">
      <EuiFlexGroup
        className={`consoleContainer${isEmbeddable ? '--embeddable' : ''}`}
        gutterSize="m"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle className="euiScreenReaderOnly">
            <h1>
              {i18n.translate('console.pageHeading', {
                defaultMessage: 'Console',
              })}
            </h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSplitPanel.Outer grow={true} borderRadius={isEmbeddable ? 'none' : 'm'}>
            <EuiSplitPanel.Inner grow={false} className="consoleTabs">
              <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
                <EuiFlexItem>
                  <TopNavMenu
                    disabled={!done}
                    items={getTopNavConfig({
                      selectedTab,
                      setSelectedTab,
                    })}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="save"
                    onClick={() => {}}
                    aria-label={i18n.translate('console.importExportButtonAriaLabel', {
                      defaultMessage: 'Import/Export',
                    })}
                    data-test-subj="consoleImportExportButton"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="keyboard"
                    onClick={() => {}}
                    aria-label={i18n.translate('console.shortcutsButtonAriaLabel', {
                      defaultMessage: 'Keyboard shortcuts',
                    })}
                    data-test-subj="consoleShortcutsButton"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="questionInCircle"
                    onClick={() => {}}
                    aria-label={i18n.translate('console.helpButtonAriaLabel', {
                      defaultMessage: 'Help',
                    })}
                    data-test-subj="consoleHelpButton"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiSplitPanel.Inner>
            <EuiHorizontalRule margin="none" />
            <EuiSplitPanel.Inner paddingSize="none">
              {selectedTab === SHELL_TAB_ID && (
                <Editor loading={!done} setEditorInstance={() => {}} />
              )}
            </EuiSplitPanel.Inner>
            <EuiHorizontalRule margin="none" />
            <EuiSplitPanel.Inner paddingSize="xs" grow={false}>
              <EuiButtonEmpty onClick={() => {}} iconType="editorCodeBlock" size="xs" color="text">
                {i18n.translate('console.variablesButton', {
                  defaultMessage: 'Variables',
                })}
              </EuiButtonEmpty>
            </EuiSplitPanel.Inner>
          </EuiSplitPanel.Outer>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
