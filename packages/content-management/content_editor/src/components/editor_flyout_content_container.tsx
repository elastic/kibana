/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import type { FC } from 'react';

import { ContentEditorFlyoutContent } from './editor_flyout_content';
import type { Props as ContentEditorFlyoutContentProps } from './editor_flyout_content';

type CommonProps = Pick<
  ContentEditorFlyoutContentProps,
  | 'item'
  | 'isReadonly'
  | 'readonlyReason'
  | 'services'
  | 'onSave'
  | 'onCancel'
  | 'entityName'
  | 'customValidators'
  | 'showActivityView'
>;

export type Props = CommonProps;

export const ContentEditorFlyoutContentContainer: FC<Props> = (props) => {
  return <ContentEditorFlyoutContent {...props} />;
};
