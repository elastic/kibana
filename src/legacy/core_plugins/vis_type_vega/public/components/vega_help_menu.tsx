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
import { EuiButtonIcon, EuiContextMenuPanel, EuiContextMenuItem, EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

function VegaHelpMenu() {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onButtonClick = useCallback(() => setIsPopoverOpen(!isPopoverOpen), [isPopoverOpen]);

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const button = (
    <EuiButtonIcon
      iconType="questionInCircle"
      onClick={onButtonClick}
      aria-label={i18n.translate('visTypeVega.editor.vegaHelpButtonAriaLabel', {
        defaultMessage: 'Vega help',
      })}
    />
  );

  const items = [
    <EuiContextMenuItem
      key="vegaHelp"
      href="https://www.elastic.co/guide/en/kibana/master/vega-graph.html"
      target="_blank"
      onClick={closePopover}
    >
      <FormattedMessage
        id="visTypeVega.editor.vegaHelpLinkText"
        defaultMessage="Kibana Vega help"
      />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="vegaLiteDocs"
      href="https://vega.github.io/vega-lite/docs/"
      target="_blank"
      onClick={closePopover}
    >
      <FormattedMessage
        id="visTypeVega.editor.vegaLiteDocumentationLinkText"
        defaultMessage="Vega-Lite documentation"
      />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="vegaDoc"
      href="https://vega.github.io/vega/docs/"
      target="_blank"
      onClick={closePopover}
    >
      <FormattedMessage
        id="visTypeVega.editor.vegaDocumentationLinkText"
        defaultMessage="Vega documentation"
      />
    </EuiContextMenuItem>,
  ];

  return (
    <EuiPopover
      id="helpMenu"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel items={items} />
    </EuiPopover>
  );
}

export { VegaHelpMenu };
