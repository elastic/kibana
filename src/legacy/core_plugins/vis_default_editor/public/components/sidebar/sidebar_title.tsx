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

import React, { useCallback, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  EuiToolTip,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { Vis } from 'src/legacy/core_plugins/visualizations/public';
import { EuiSpacer } from '@elastic/eui';
import { SavedSearch } from '../../../../kibana/public/discover/np_ready/types';

interface LinkedSearchProps {
  savedSearch: SavedSearch;
  vis: Vis;
}

interface SidebarTitleProps {
  isLinkedSearch: boolean;
  savedSearch?: SavedSearch;
  vis: Vis;
}

export function LinkedSearch({ savedSearch, vis }: LinkedSearchProps) {
  const [showPopover, setShowPopover] = useState(false);
  const closePopover = useCallback(() => setShowPopover(false), []);
  const onClickButtonLink = useCallback(() => setShowPopover(v => !v), []);
  const onClickUnlikFromSavedSearch = useCallback(() => {
    setShowPopover(false);
    vis.emit('unlinkFromSavedSearch');
  }, [vis]);

  const linkButtonTooltipText = i18n.translate(
    'visDefaultEditor.sidebar.savedSearch.linkButtonTooltipText',
    {
      defaultMessage: 'Click to read additional information or break link to saved search',
    }
  );

  return (
    <EuiFlexGroup
      alignItems="center"
      className="visEditorSidebar__titleContainer visEditorSidebar__linkedSearch"
      gutterSize="xs"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiIcon type="search" />
      </EuiFlexItem>

      <EuiFlexItem className="visEditorSidebar__titleText" grow={false}>
        <EuiTitle size="xs">
          <h2
            title={i18n.translate('visDefaultEditor.sidebar.savedSearch.titleAriaLabel', {
              defaultMessage: 'Saved search: {title}',
              values: {
                title: savedSearch.title,
              },
            })}
          >
            {savedSearch.title}
          </h2>
        </EuiTitle>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiPopover
          anchorPosition="downRight"
          ownFocus
          button={
            <EuiToolTip content={linkButtonTooltipText}>
              <EuiButtonIcon
                aria-label={linkButtonTooltipText}
                data-test-subj="unlinkSavedSearch"
                iconType="link"
                onClick={onClickButtonLink}
              />
            </EuiToolTip>
          }
          isOpen={showPopover}
          closePopover={closePopover}
          panelPaddingSize="s"
        >
          <EuiPopoverTitle>
            <FormattedMessage
              id="visDefaultEditor.sidebar.savedSearch.popoverTitle"
              defaultMessage="Linked to saved search"
            />
          </EuiPopoverTitle>
          <div style={{ width: '300px' }}>
            <EuiText>
              <p>
                <FormattedMessage
                  id="visDefaultEditor.sidebar.savedSearch.popoverHelpText"
                  defaultMessage="When you build a visualization from a saved search, any subsequent
                  modifications to the saved search are automatically reflected in the
                  visualization. To disable automatic updates, you can disconnect a visualization
                  from the saved search."
                />
              </p>
            </EuiText>

            <EuiSpacer size="m" />

            <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="none">
              <EuiFlexItem>
                <EuiButtonEmpty href={`#/discover/${savedSearch.id}`} size="s">
                  <FormattedMessage
                    id="visDefaultEditor.sidebar.savedSearch.goToDiscoverButtonText"
                    defaultMessage="View in Discover"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButtonEmpty color="danger" onClick={onClickUnlikFromSavedSearch} size="s">
                  <FormattedMessage
                    id="visDefaultEditor.sidebar.savedSearch.unlinkSavedSearchButtonText"
                    defaultMessage="Break link to saved search"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function SidebarTitle({ savedSearch, vis, isLinkedSearch }: SidebarTitleProps) {
  return isLinkedSearch && savedSearch ? (
    <LinkedSearch savedSearch={savedSearch} vis={vis} />
  ) : vis.type.options.showIndexSelection ? (
    <EuiTitle size="xs" className="visEditorSidebar__titleContainer visEditorSidebar__titleText">
      <h2
        title={i18n.translate('visDefaultEditor.sidebar.indexPatternAriaLabel', {
          defaultMessage: 'Index pattern: {title}',
          values: {
            title: vis.indexPattern.title,
          },
        })}
      >
        {vis.indexPattern.title}
      </h2>
    </EuiTitle>
  ) : (
    <div className="visEditorSidebar__indexPatternPlaceholder" />
  );
}

export { SidebarTitle };
