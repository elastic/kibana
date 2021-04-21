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
import { EuiSpacer, EuiButton, EuiText, EuiWrappingPopover, EuiCode } from '@elastic/eui';
import { getServices } from '../../../kibana_services';
import './open_options_popover.scss';
import { DOC_TABLE_LEGACY } from '../../../../common';

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
    ? i18n.translate('discover.openOptionsPopover.legacyTableText', {
        defaultMessage: 'Legacy table',
      })
    : i18n.translate('discover.openOptionsPopover.dataGridText', {
        defaultMessage: 'Data grid',
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
                      id="discover.topNav.optionsPopover.currentViewModeLabel"
                      defaultMessage="Current view mode"
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
          <FormattedMessage
            id="discover.topNav.openOptionsPopover.description"
            defaultMessage="The new data grid layout includes enhanced data sorting, drag-and-drop columns, multi-document selection, and a full screen view. Toggle 'Use legacy table' in Advanced Settings to switch modes."
          />
        </EuiText>
        <EuiSpacer />
        <EuiButton
          iconType="tableDensityNormal"
          fullWidth
          href={addBasePath(`/app/management/kibana/settings?query=${DOC_TABLE_LEGACY}`)}
        >
          {i18n.translate('discover.openOptionsPopover.goToAdvancedSettings', {
            defaultMessage: 'Go to Advanced Settings',
          })}
        </EuiButton>
      </div>
    </EuiWrappingPopover>
  );
}

export function openOptionsPopover({
  I18nContext,
  anchorElement,
}: {
  I18nContext: I18nStart['Context'];
  anchorElement: HTMLElement;
}) {
  if (isOpen) {
    return;
  }

  isOpen = true;
  const container = document.createElement('div');
  const onClose = () => {
    ReactDOM.unmountComponentAtNode(container);
    document.body.removeChild(container);
    isOpen = false;
  };

  document.body.appendChild(container);

  const element = (
    <I18nContext>
      <OptionsPopover onClose={onClose} anchorElement={anchorElement} />
    </I18nContext>
  );
  ReactDOM.render(element, container);
}
