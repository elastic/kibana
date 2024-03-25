/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiProgress } from '@elastic/eui';
import { css } from '@emotion/react';

const containerStyle = css`
  position: relative;
  width: 100%;
  height: 100%;
`;

/**
 * A top level wrapper props
 * @public
 */
export interface FieldListProps {
  'data-test-subj'?: string;
  isProcessing: boolean;
  prepend?: React.ReactNode;
  append?: React.ReactNode;
  className?: string;
}

/**
 * A top level wrapper for field list components (filters and field list groups)
 * @param dataTestSubject
 * @param isProcessing
 * @param prepend
 * @param append
 * @param className
 * @param children
 * @public
 * @constructor
 */
export const FieldList: React.FC<FieldListProps> = ({
  'data-test-subj': dataTestSubject = 'fieldList',
  isProcessing,
  prepend,
  append,
  className,
  children,
}) => {
  return (
    <EuiFlexGroup
      gutterSize="none"
      direction="column"
      responsive={false}
      data-test-subj={dataTestSubject}
      css={containerStyle}
      className={className}
    >
      {isProcessing && (
        <EuiProgress
          size="xs"
          color="accent"
          position="absolute"
          data-test-subj={`${dataTestSubject}Loading`}
        />
      )}
      {!!prepend && <EuiFlexItem grow={false}>{prepend}</EuiFlexItem>}
      <EuiFlexItem className="unifiedFieldListSidebar__accordionContainer" grow={true}>
        {children}
      </EuiFlexItem>
      {!!append && <EuiFlexItem grow={false}>{append}</EuiFlexItem>}
    </EuiFlexGroup>
  );
};
