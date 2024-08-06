import React, { useState, useCallback } from 'react';
import {
  EuiIcon,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
  EuiLink,
} from '@elastic/eui';
import { NotificationsSetup } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

interface Props {
  getCurl: () => Promise<string>;
  getDocumentation: () => Promise<string | null>;
  autoIndent: (ev: React.MouseEvent) => void;
  notifications: NotificationsSetup;
}

export const ContextMenu = ({ getCurl, getDocumentation, autoIndent, notifications }: Props) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [curlCode, setCurlCode] = useState('');
  const [curlError, setCurlError] = useState(null);

  const mouseEnter = useCallback(() => {
    if (isPopoverOpen) return;
    getCurl()
      .then((text) => {
        setCurlCode(text);
        setCurlError(null);
      })
      .catch((e) => {
        setCurlError(e);
      });
  }, [isPopoverOpen, getCurl]);

  const copyText = async (text: string) => {
    if (curlError) {
      throw curlError;
    }
    if (window.navigator?.clipboard) {
      await window.navigator.clipboard.writeText(text);
      return;
    }
    throw new Error('Could not copy to clipboard!');
  };

  const copyAsCurl = async () => {
    try {
      await copyText(curlCode);
      notifications.toasts.add({
        title: i18n.translate('console.consoleMenu.copyAsCurlMessage', {
          defaultMessage: 'Request copied as cURL',
        }),
      });
    } catch (e) {
      notifications.toasts.addError(e, {
        title: i18n.translate('console.consoleMenu.copyAsCurlFailedMessage', {
          defaultMessage: 'Could not copy request as cURL',
        }),
      });
    }
  };

  const onButtonClick = () => {
    setIsPopoverOpen((prev) => !prev);
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const openDocs = async () => {
    closePopover();
    const documentation = await getDocumentation();
    if (!documentation) {
      return;
    }
    window.open(documentation, '_blank');
  };

  const handleAutoIndent = (event: React.MouseEvent) => {
    closePopover();
    autoIndent(event);
  };

  const button = (
    <EuiLink
      onClick={onButtonClick}
      data-test-subj="toggleConsoleMenu"
      aria-label={i18n.translate('console.requestOptionsButtonAriaLabel', {
        defaultMessage: 'Request options',
      })}
    >
      <EuiIcon type="boxesVertical" />
    </EuiLink>
  );

  const items = [
    <EuiContextMenuItem
      key="Copy as cURL"
      data-test-subj="consoleMenuCopyAsCurl"
      id="ConCopyAsCurl"
      disabled={!window.navigator?.clipboard}
      onClick={() => {
        closePopover();
        copyAsCurl();
      }}
      icon="copyClipboard"
    >
      <FormattedMessage
        id="console.requestOptions.copyAsUrlButtonLabel"
        defaultMessage="Copy cURL command!!"
      />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      data-test-subj="consoleMenuAutoIndent"
      key="Auto indent"
      onClick={handleAutoIndent}
      icon="arrowEnd"
    >
      <FormattedMessage
        id="console.requestOptions.autoIndentButtonLabel"
        defaultMessage="Apply indentations"
      />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="Open documentation"
      data-test-subj="consoleMenuOpenDocs"
      onClick={openDocs}
      icon="documentation"
    >
      <FormattedMessage
        id="console.requestOptions.openDocumentationButtonLabel"
        defaultMessage="View documentation"
      />
    </EuiContextMenuItem>,
  ];

  return (
    <span onMouseEnter={mouseEnter}>
      <EuiPopover
        id="contextMenu"
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel items={items} data-test-subj="consoleMenu" />
      </EuiPopover>
    </span>
  );
};
