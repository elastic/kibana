/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, useMemo } from 'react';
import { EuiCodeBlock, EuiSpacer, EuiLoadingSpinner, EuiErrorBoundary } from '@elastic/eui';
import { Content } from './content';
import { getServices } from '../../kibana_services';
import { InstructionType } from '../../../services/tutorials/types';

export interface InstructionProps extends InstructionType {
  variantId: string;
  isCloudEnabled: boolean;
  replaceTemplateStrings: (text: string) => string;
}

export function Instruction({
  commands,
  textPost,
  textPre,
  replaceTemplateStrings,
  customComponentName,
  variantId,
  isCloudEnabled,
}: InstructionProps) {
  const { tutorialService, http, theme, getBasePath, kibanaVersion } = getServices();

  let pre;
  if (textPre) {
    pre = (
      <>
        <Content text={replaceTemplateStrings(textPre)} />
        <EuiSpacer size="m" />
      </>
    );
  }

  let post;
  if (textPost) {
    post = (
      <>
        <EuiSpacer size="m" />
        <Content text={replaceTemplateStrings(textPost)} />
      </>
    );
  }
  const customComponent = customComponentName
    ? tutorialService.getCustomComponent(customComponentName)
    : null;
  const LazyCustomComponent = useMemo(() => {
    if (customComponent) {
      return React.lazy(() => customComponent().then((component) => ({ default: component })));
    }
  }, [customComponent]);

  let commandBlock;
  if (commands) {
    const cmdText = commands
      .map((cmd) => {
        return replaceTemplateStrings(cmd);
      })
      .join('\n');
    commandBlock = (
      <EuiCodeBlock isCopyable language="bash">
        {cmdText}
      </EuiCodeBlock>
    );
  }

  const darkTheme = theme?.getTheme().darkMode ?? false;

  return (
    <div>
      {pre}
      {commandBlock}
      {LazyCustomComponent && (
        <Suspense fallback={<EuiLoadingSpinner />}>
          <EuiErrorBoundary>
            <LazyCustomComponent
              basePath={getBasePath()}
              isDarkTheme={darkTheme}
              http={http}
              variantId={variantId}
              isCloudEnabled={isCloudEnabled}
              kibanaVersion={kibanaVersion}
            />
          </EuiErrorBoundary>
        </Suspense>
      )}
      {post}
    </div>
  );
}
