/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Suspense, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Content } from './content';

import { EuiCodeBlock, EuiSpacer, EuiLoadingSpinner, EuiErrorBoundary } from '@elastic/eui';

import { getServices } from '../../kibana_services';

export function Instruction({
  commands,
  paramValues,
  textPost,
  textPre,
  replaceTemplateStrings,
  customComponentName,
  variantId,
  isCloudEnabled,
}) {
  const { tutorialService, http, uiSettings, getBasePath, kibanaVersion } = getServices();

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
  const customComponent = tutorialService.getCustomComponent(customComponentName);
  //Memoize the custom component so it wont rerender everytime
  const LazyCustomComponent = useMemo(() => {
    if (customComponent) {
      return React.lazy(() => customComponent());
    }
  }, [customComponent]);

  let commandBlock;
  if (commands) {
    const cmdText = commands
      .map((cmd) => {
        return replaceTemplateStrings(cmd, paramValues);
      })
      .join('\n');
    commandBlock = (
      <EuiCodeBlock isCopyable language="bash">
        {cmdText}
      </EuiCodeBlock>
    );
  }

  return (
    <div>
      {pre}

      {commandBlock}

      {LazyCustomComponent && (
        <Suspense fallback={<EuiLoadingSpinner />}>
          <EuiErrorBoundary>
            <LazyCustomComponent
              basePath={getBasePath()}
              isDarkTheme={uiSettings.get('theme:darkMode')}
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

Instruction.propTypes = {
  commands: PropTypes.array,
  paramValues: PropTypes.object.isRequired,
  textPost: PropTypes.string,
  textPre: PropTypes.string,
  replaceTemplateStrings: PropTypes.func.isRequired,
  customComponentName: PropTypes.string,
  variantId: PropTypes.string,
  isCloudEnabled: PropTypes.bool.isRequired,
};
