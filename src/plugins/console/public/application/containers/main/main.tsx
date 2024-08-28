/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiPageTemplate,
  EuiSplitPanel,
  EuiHorizontalRule,
  EuiButtonEmpty,
} from '@elastic/eui';
import { downloadFileAs } from '@kbn/share-plugin/public';
import { MAIN_PANEL_LABELS } from './i18n';
import { NavIconButton } from './nav_icon_button';
import { Editor } from '../editor';
import { TopNavMenu, SomethingWentWrongCallout } from '../../components';
import { useDataInit } from '../../hooks';
import { getTopNavConfig } from './get_top_nav';
import { SHELL_TAB_ID } from './tab_ids';
import { useEditorReadContext } from '../../contexts';

interface MainProps {
  isEmbeddable?: boolean;
}

const EXPORT_FILE_NAME = 'console_export';

export function Main({ isEmbeddable = false }: MainProps) {
  const [selectedTab, setSelectedTab] = useState(SHELL_TAB_ID);

  const { done, error, retry } = useDataInit();

  const { currentTextObject } = useEditorReadContext();

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
            <h1>{MAIN_PANEL_LABELS.consolePageHeading}</h1>
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
                  <EuiButtonEmpty
                    iconType="download"
                    onClick={() =>
                      downloadFileAs(EXPORT_FILE_NAME, {
                        content: currentTextObject?.text,
                        type: 'txt',
                      })
                    }
                    size="xs"
                    dataTestSubj="consoleExportFileButton"
                  >
                    {MAIN_PANEL_LABELS.exportFileButton}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <NavIconButton
                    iconType="keyboard"
                    onClick={() => {}}
                    ariaLabel={MAIN_PANEL_LABELS.shortcutsButton}
                    dataTestSubj="consoleShortcutsButton"
                    toolTipContent={MAIN_PANEL_LABELS.shortcutsButton}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <NavIconButton
                    iconType="questionInCircle"
                    onClick={() => {}}
                    ariaLabel={MAIN_PANEL_LABELS.helpButton}
                    dataTestSubj="consoleHelpButton"
                    toolTipContent={MAIN_PANEL_LABELS.helpButton}
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
                {MAIN_PANEL_LABELS.variablesButton}
              </EuiButtonEmpty>
            </EuiSplitPanel.Inner>
          </EuiSplitPanel.Outer>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
