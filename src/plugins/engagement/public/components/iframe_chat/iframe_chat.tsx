/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef, useState, CSSProperties } from 'react';
import { css } from '@emotion/react';
import { useChat } from '../../services';

type UseChatType =
  | [false]
  | [true, string, React.MutableRefObject<HTMLIFrameElement | null>, CSSProperties];

const MESSAGE_READY = 'driftIframeReady';
const MESSAGE_RESIZE = 'driftIframeResize';
const MESSAGE_SET_CONTEXT = 'driftSetContext';

const iframeStyle = css`
  position: fixed;
  botton: 30px;
  right: 30px;
  display: block;
`;

const getContext = () => {
  const { location, navigator, innerHeight, innerWidth } = window;
  const { hash, host, hostname, href, origin, pathname, port, protocol, search } = location;
  const { language, userAgent } = navigator;
  const { title, referrer } = document;

  return {
    window: {
      location: {
        hash,
        host,
        hostname,
        href,
        origin,
        pathname,
        port,
        protocol,
        search,
      },
      navigator: { language, userAgent },
      innerHeight,
      innerWidth,
    },
    document: {
      title,
      referrer,
    },
  };
};

const useFrame = (): UseChatType => {
  const chatRef = useRef<HTMLIFrameElement>(null);
  const chat = useChat();
  const [style, setStyle] = useState<CSSProperties>({});

  useEffect(() => {
    const handleMessage = (event: MessageEvent): void => {
      const { current: chatIframe } = chatRef;

      if (
        !chat.enabled ||
        !chatIframe?.contentWindow ||
        event.source !== chatIframe?.contentWindow
      ) {
        return;
      }

      const { data: message } = event;
      const context = getContext();

      switch (message.type) {
        case MESSAGE_READY: {
          const user = {
            id: chat.pocID,
            attributes: {
              email: chat.pocEmail,
            },
            jwt: chat.pocJWT,
          };

          chatIframe.contentWindow.postMessage(
            {
              type: MESSAGE_SET_CONTEXT,
              data: { context, user },
            },
            '*'
          );
          break;
        }

        case MESSAGE_RESIZE: {
          const styles = message.data.styles || ({} as CSSProperties);
          setStyle({ ...style, ...styles });
          break;
        }

        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [chat, style]);

  if (chat.enabled) {
    return [true, chat.chatURL, chatRef, style];
  }

  return [false];
};

export const Chat = () => {
  const [enabled, chatUrl, chatRef, style] = useFrame();

  if (!enabled) {
    return null;
  }

  return (
    <iframe
      css={iframeStyle}
      style={style}
      data-test-id="iframe-chat"
      ref={chatRef}
      src={chatUrl}
      title="engagement"
    />
  );
};
