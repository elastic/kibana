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
import { EventEmitter } from 'events';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { Vis } from 'src/plugins/visualizations/public';
import { SavedObject } from 'src/plugins/saved_objects/public';
import { useKibana } from '../../../../kibana_react/public';

interface LinkedSearchProps {
  savedSearch: SavedObject;
  eventEmitter: EventEmitter;
}

interface SidebarTitleProps {
  isLinkedSearch: boolean;
  savedSearch?: SavedObject;
  vis: Vis;
  eventEmitter: EventEmitter;
}

export function LinkedSearch({ savedSearch, eventEmitter }: LinkedSearchProps) {
  const [showPopover, setShowPopover] = useState(false);
  const {
    services: { application },
  } = useKibana();

  const closePopover = useCallback(() => setShowPopover(false), []);
  const onClickButtonLink = useCallback(() => setShowPopover((v) => !v), []);
  const onClickUnlikFromSavedSearch = useCallback(() => {
    setShowPopover(false);
    eventEmitter.emit('unlinkFromSavedSearch');
  }, [eventEmitter]);
  const onClickViewInDiscover = useCallback(() => {
    application.navigateToApp('discover', {
      path: `#/${savedSearch.id}`,
    });
  }, [application, savedSearch.id]);

  const linkButtonAriaLabel = i18n.translate(
    'visDefaultEditor.sidebar.savedSearch.linkButtonAriaLabel',
    {
      defaultMessage: 'Link to saved search. Click to learn more or break link.',
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

      <EuiFlexItem grow={false} className="eui-textTruncate">
        <EuiTitle size="xs" className="eui-textTruncate">
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
          button={
            <EuiToolTip content={linkButtonAriaLabel}>
              <EuiButtonIcon
                aria-label={linkButtonAriaLabel}
                data-test-subj="showUnlinkSavedSearchPopover"
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
          <div style={{ width: 260 }}>
            <EuiText size="s">
              <p>
                <EuiButtonEmpty flush="left" onClick={onClickViewInDiscover} size="xs">
                  <FormattedMessage
                    id="visDefaultEditor.sidebar.savedSearch.goToDiscoverButtonText"
                    defaultMessage="View this search in Discover"
                  />
                </EuiButtonEmpty>
              </p>
              <p>
                <FormattedMessage
                  id="visDefaultEditor.sidebar.savedSearch.popoverHelpText"
                  defaultMessage="Subsequent modifications to this saved search are reflected in the visualization. To disable automatic updates, remove the link."
                />
              </p>
              <p>
                <EuiButton
                  color="danger"
                  data-test-subj="unlinkSavedSearch"
                  fullWidth
                  onClick={onClickUnlikFromSavedSearch}
                  size="s"
                >
                  <FormattedMessage
                    id="visDefaultEditor.sidebar.savedSearch.unlinkSavedSearchButtonText"
                    defaultMessage="Remove link to saved search"
                  />
                </EuiButton>
              </p>
            </EuiText>
          </div>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function SidebarTitle({ savedSearch, vis, isLinkedSearch, eventEmitter }: SidebarTitleProps) {
  return isLinkedSearch && savedSearch ? (
    <LinkedSearch savedSearch={savedSearch} eventEmitter={eventEmitter} />
  ) : vis.type.options.showIndexSelection ? (
    <EuiTitle size="xs" className="visEditorSidebar__titleContainer eui-textTruncate">
      <h2
        title={i18n.translate('visDefaultEditor.sidebar.indexPatternAriaLabel', {
          defaultMessage: 'Index pattern: {title}',
          values: {
            title: vis.data.indexPattern!.title,
          },
        })}
      >
        {vis.data.indexPattern!.title}
      </h2>
    </EuiTitle>
  ) : (
    <div className="visEditorSidebar__indexPatternPlaceholder" />
  );
}

export { SidebarTitle };
