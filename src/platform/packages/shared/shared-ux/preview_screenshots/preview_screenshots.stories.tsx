/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  EuiButton,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiImage,
  EuiText,
  EuiProvider,
  useEuiTheme,
  EuiMarkdownEditor,
} from '@elastic/eui';

import { takePreviewScreenshot } from './take_screenshot';
import mdx from './README.mdx';
import { getStorageKey } from './lib';

export default {
  title: 'Horizons/Preview Screenshots',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

const DEFAULT_MARKDOWN = `
# Markdown Editor Example
This is an example of a markdown editor within a panel.
## Features
- **Live preview** of markdown content
- Supports various markdown syntax
- Customizable styles
- Easy to integrate with EUI components
- Provides a clean and user-friendly interface
- Allows for rich text formatting
- Supports images, links, and lists
`;

const DemoComponent = () => {
  const { euiTheme } = useEuiTheme();
  const [value, setValue] = useState<string>(DEFAULT_MARKDOWN);

  return (
    <div
      className="kbnAppWrapper"
      style={{
        padding: '16px',
        backgroundColor: euiTheme.colors.backgroundBaseDisabled,
        width: '800px',
        height: '600px',
      }}
    >
      <EuiTitle size="l" aria-label="title">
        <h2>Here is a panel with a Markdown Editor</h2>
      </EuiTitle>
      <EuiSpacer />
      <EuiPanel>
        <EuiMarkdownEditor
          aria-labelledby="title"
          onChange={setValue}
          value={value}
          initialViewMode="viewing"
        />
        <EuiSpacer />
        <EuiText>
          <p>Feel free to edit the above Markdown and capture the screenshot.</p>
        </EuiText>
      </EuiPanel>
    </div>
  );
};

const ScreenshotPreview = ({ savedObjectId }: { savedObjectId: string }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const updateScreenshot = useCallback(() => {
    const item = sessionStorage.getItem(getStorageKey(savedObjectId));

    if (item) {
      try {
        const { image } = JSON.parse(item);
        setImageUrl(image);
      } catch (e) {
        // ignore
      }
    } else {
      setImageUrl(null);
    }
  }, [savedObjectId]);

  useEffect(() => {
    const interval = setInterval(updateScreenshot, 500);
    return () => clearInterval(interval);
  }, [updateScreenshot]);

  if (!imageUrl) {
    return null;
  }

  return (
    <div>
      <EuiTitle size="xs">
        <h4>Stored Screenshot</h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiImage src={imageUrl} alt="screenshot" />
    </div>
  );
};

interface TakeScreenshotProps {
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: number;
}

export const TakeScreenshot = ({ maxWidth, maxHeight, aspectRatio }: TakeScreenshotProps) => {
  const savedObjectId = 'my-saved-object-id-1';

  useEffect(() => {
    // Clear the screenshot on mount to ensure a fresh start
    sessionStorage.removeItem(getStorageKey(savedObjectId));
    takePreviewScreenshot({ savedObjectId, maxWidth, maxHeight, aspectRatio });
  }, [aspectRatio, maxHeight, maxWidth, savedObjectId]);

  return (
    <EuiProvider colorMode="light">
      <div>
        <DemoComponent />
        <EuiSpacer />
        <EuiButton
          onClick={() => takePreviewScreenshot({ savedObjectId, maxWidth, maxHeight, aspectRatio })}
        >
          Refresh Screenshot
        </EuiButton>
        <EuiSpacer />
        <ScreenshotPreview savedObjectId={savedObjectId} />
      </div>
    </EuiProvider>
  );
};

TakeScreenshot.storyName = 'Preview Screenshots';

TakeScreenshot.args = {
  maxWidth: undefined,
  maxHeight: undefined,
  aspectRatio: undefined,
};

TakeScreenshot.argTypes = {
  maxWidth: {
    control: { type: 'number', min: 100, max: 1000, step: 50 },
  },
  maxHeight: {
    control: { type: 'number', min: 100, max: 1000, step: 50 },
  },
  aspectRatio: {
    control: { type: 'number', min: 0.1, max: 2, step: 0.05 },
  },
};
