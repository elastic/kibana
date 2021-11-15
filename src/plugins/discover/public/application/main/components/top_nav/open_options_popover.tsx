/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nStart } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiSpacer,
  EuiButton,
  EuiText,
  EuiWrappingPopover,
  EuiCode,
  EuiHorizontalRule,
  EuiButtonEmpty,
  EuiTextAlign,
} from '@elastic/eui';
import './open_options_popover.scss';
import { DOC_TABLE_LEGACY } from '../../../../../common';
import { getServices } from '../../../../kibana_services';

const container = document.createElement('div');
let isOpen = false;

interface OptionsPopoverProps {
  onClose: () => void;
  anchorElement: HTMLElement;
}

export function OptionsPopover(props: OptionsPopoverProps) {
  const {
    core: { uiSettings },
    addBasePath,
  } = getServices();
  const isLegacy = uiSettings.get(DOC_TABLE_LEGACY);

  const mode = isLegacy
    ? i18n.translate('discover.openOptionsPopover.classicDiscoverText', {
        defaultMessage: 'Classic',
      })
    : i18n.translate('discover.openOptionsPopover.documentExplorerText', {
        defaultMessage: 'Document Explorer',
      });

  return (
    <EuiWrappingPopover ownFocus button={props.anchorElement} closePopover={props.onClose} isOpen>
      <div className="dscOptionsPopover">
        <EuiText color="subdued" size="s">
          <p>
            <FormattedMessage
              id="discover.topNav.optionsPopover.currentViewMode"
              defaultMessage="{viewModeLabel}: {currentViewMode}"
              values={{
                viewModeLabel: (
                  <strong>
                    <FormattedMessage
                      id="discover.topNav.optionsPopover.discoverViewModeLabel"
                      defaultMessage="Discover view mode"
                    />
                  </strong>
                ),
                currentViewMode: <EuiCode data-test-subj="docTableMode">{mode}</EuiCode>,
              }}
            />
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText color="subdued" size="s">
          {isLegacy ? (
            <FormattedMessage
              id="discover.topNav.openOptionsPopover.documentExplorerDisabledHint"
              defaultMessage="Did you know Discover has a new Document Explorer with better data sorting, resizable columns,
                and a full screen view? You can change the view mode in Advanced Settings."
            />
          ) : (
            <FormattedMessage
              id="discover.topNav.openOptionsPopover.documentExplorerEnabledHint"
              defaultMessage="You can switch back to the classic Discover view in Advanced Settings."
            />
          )}
        </EuiText>
        {isLegacy && (
          <>
            <EuiSpacer />
            <EuiButton
              iconType="tableDensityNormal"
              fullWidth
              href={addBasePath(`/app/management/kibana/settings?query=${DOC_TABLE_LEGACY}`)}
            >
              {i18n.translate('discover.openOptionsPopover.tryDocumentExplorer', {
                defaultMessage: 'Try Document Explorer',
              })}
            </EuiButton>
          </>
        )}
        <EuiHorizontalRule margin="s" />
        <EuiTextAlign textAlign="center">
          <EuiButtonEmpty
            iconType="gear"
            size="s"
            href={addBasePath(`/app/management/kibana/settings?query=category:(discover)`)}
          >
            {i18n.translate('discover.openOptionsPopover.gotToSettings', {
              defaultMessage: 'View Discover settings',
            })}
          </EuiButtonEmpty>
        </EuiTextAlign>
      </div>
    </EuiWrappingPopover>
  );
}

function onClose() {
  ReactDOM.unmountComponentAtNode(container);
  document.body.removeChild(container);
  isOpen = false;
}

export function openOptionsPopover({
  I18nContext,
  anchorElement,
}: {
  I18nContext: I18nStart['Context'];
  anchorElement: HTMLElement;
}) {
  if (isOpen) {
    onClose();
    return;
  }

  isOpen = true;
  document.body.appendChild(container);

  const element = (
    <I18nContext>
      <OptionsPopover onClose={onClose} anchorElement={anchorElement} />
    </I18nContext>
  );
  ReactDOM.render(element, container);
}
