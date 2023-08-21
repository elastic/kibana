/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import useObservable from 'react-use/lib/useObservable';

import {
  EuiText,
  EuiImage,
  EuiPanel,
  EuiSpacer,
  EuiButton,
  EuiEmptyPrompt,
  EuiFormRow,
} from '@elastic/eui';

import { coreServices } from '../../services/kibana_services';
import { NavEmbeddableStrings } from '../navigation_embeddable_strings';

import noLinksIllustrationDark from '../../assets/empty_links_dark.svg';
import noLinksIllustrationLight from '../../assets/empty_links_light.svg';

import './navigation_embeddable_editor.scss';

export const NavigationEmbeddablePanelEditorEmptyPrompt = ({
  addLink,
}: {
  addLink: () => Promise<void>;
}) => {
  const isDarkTheme = useObservable(coreServices.theme.theme$)?.darkMode;

  return (
    <EuiFormRow>
      <EuiPanel paddingSize="m" hasBorder={true}>
        <EuiEmptyPrompt
          paddingSize="none"
          hasShadow={false}
          color="plain"
          icon={
            <EuiImage
              alt="alt"
              size="s"
              src={isDarkTheme ? noLinksIllustrationDark : noLinksIllustrationLight}
            />
          }
          body={
            <>
              <EuiText size="s">
                {NavEmbeddableStrings.editor.panelEditor.getEmptyLinksMessage()}
              </EuiText>
              <EuiSpacer size="m" />
              <EuiButton size="s" onClick={addLink} iconType="plusInCircle">
                {NavEmbeddableStrings.editor.getAddButtonLabel()}
              </EuiButton>
            </>
          }
        />
      </EuiPanel>
    </EuiFormRow>
  );
};
