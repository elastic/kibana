/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiAccordion } from '@elastic/eui';
import React from 'react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { Stackframe as StackframeType, StackframeWithLineContext } from '@kbn/apm-es-schemas';
import { Context } from './context';
import { FrameHeading } from './frame_heading';
import { Variables } from './variables';

const ContextContainer = euiStyled.div<{ isLibraryFrame: boolean }>`
  position: relative;
  font-family: ${({ theme }) => theme.eui.euiCodeFontFamily};
  font-size: ${({ theme }) => theme.eui.euiFontSizeS};
  border: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
  border-radius: ${({ theme }) => theme.eui.euiBorderRadiusSmall};
  background: ${({ isLibraryFrame, theme }) =>
    isLibraryFrame ? theme.eui.euiColorEmptyShade : theme.eui.euiColorLightestShade};
`;

// Indent the non-context frames the same amount as the accordion control
const NoContextFrameHeadingWrapper = euiStyled.div`
  margin-left: 28px;
`;

interface Props {
  stackframe: StackframeType;
  codeLanguage?: string;
  id: string;
  initialIsOpen?: boolean;
  isLibraryFrame?: boolean;
}

export function Stackframe({
  stackframe,
  codeLanguage,
  id,
  initialIsOpen = false,
  isLibraryFrame = false,
}: Props) {
  if (!hasLineContext(stackframe)) {
    return (
      <NoContextFrameHeadingWrapper>
        <FrameHeading
          codeLanguage={codeLanguage}
          stackframe={stackframe}
          isLibraryFrame={isLibraryFrame}
          idx={id}
        />
      </NoContextFrameHeadingWrapper>
    );
  }

  return (
    <EuiAccordion
      buttonContent={
        <FrameHeading
          codeLanguage={codeLanguage}
          stackframe={stackframe}
          isLibraryFrame={isLibraryFrame}
          idx={id}
        />
      }
      id={id}
      initialIsOpen={initialIsOpen}
    >
      <ContextContainer isLibraryFrame={isLibraryFrame}>
        <Context
          stackframe={stackframe}
          codeLanguage={codeLanguage}
          isLibraryFrame={isLibraryFrame}
        />
      </ContextContainer>
      <Variables vars={stackframe.vars} />
    </EuiAccordion>
  );
}

function hasLineContext(stackframe: StackframeType): stackframe is StackframeWithLineContext {
  return stackframe.line?.hasOwnProperty('context') || false;
}
