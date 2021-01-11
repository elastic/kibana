/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import './panel_toolbar.scss';
import React, { FC, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPopover, EuiContextMenu } from '@elastic/eui';
import {
  Embeddable,
  EmbeddableInput,
  ErrorEmbeddable,
  EmbeddableFactory,
} from 'src/plugins/embeddable/public';

interface Props {
  /** The label for the primary action button */
  primaryActionButton: JSX.Element;
  /** Click handler for the library button */
  onLibraryClick: () => void;
  /** Handler for creating new embeddables */
  addNewEmbeddable: (
    type: string,
    explicitInput: Partial<EmbeddableInput>
  ) => Promise<Embeddable | ErrorEmbeddable>;
  /** Array of embeddable factories used to populate the editor menu */
  factories: EmbeddableFactory[];
}

export const PanelToolbar: FC<Props> = ({
  primaryActionButton,
  onLibraryClick,
  addNewEmbeddable,
  factories,
}) => {
  const [isEditorMenuOpen, setEditorMenuOpen] = useState(false);
  const toggleEditorMenu = () => setEditorMenuOpen(!isEditorMenuOpen);
  const closeEditorMenu = () => setEditorMenuOpen(false);

  const editorMenuButtonLabel = i18n.translate('dashboard.panelToolbar.editorMenuButtonLabel', {
    defaultMessage: 'All editors',
  });

  const panels = [
    {
      id: 0,
      title: editorMenuButtonLabel,
      items: [
        ...factories.map((factory) => {
          const onClick = async () => {
            const explicitInput = await factory.getExplicitInput();
            await addNewEmbeddable(factory.type, explicitInput);
          };
          return {
            name: factory.getDisplayName(),
            icon: 'empty',
            onClick,
          };
        }),
      ],
    },
  ];

  const editorMenuButton = (
    <EuiButton
      size="s"
      color="text"
      className="panelToolbarButton"
      iconType="visualizeApp"
      onClick={toggleEditorMenu}
    >
      {editorMenuButtonLabel}
    </EuiButton>
  );

  return (
    <EuiFlexGroup className="panelToolbar" id="kbnDashboard__panelToolbar" gutterSize="s">
      <EuiFlexItem grow={false}>{primaryActionButton}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          ownFocus
          button={editorMenuButton}
          isOpen={isEditorMenuOpen}
          closePopover={closeEditorMenu}
          panelPaddingSize="none"
          anchorPosition="downLeft"
        >
          <EuiContextMenu initialPanelId={0} panels={panels} />
        </EuiPopover>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          color="text"
          className="panelToolbarButton"
          iconType="folderOpen"
          onClick={onLibraryClick}
        >
          {i18n.translate('dashboard.panelToolbar.libraryButtonLabel', {
            defaultMessage: 'Add from library',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
