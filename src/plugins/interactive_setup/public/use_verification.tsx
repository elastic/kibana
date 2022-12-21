/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiModal, EuiModalHeader } from '@elastic/eui';
import constate from 'constate';
import type { FunctionComponent } from 'react';
import React, { useEffect, useRef, useState } from 'react';

import { euiThemeVars } from '@kbn/ui-theme';

import { useKibana } from './use_kibana';
import { VerificationCodeForm } from './verification_code_form';

export interface VerificationProps {
  defaultCode?: string;
}

const [OuterVerificationProvider, useVerification] = constate(
  ({ defaultCode }: VerificationProps) => {
    const codeRef = useRef(defaultCode);
    const [status, setStatus] = useState<'unknown' | 'unverified' | 'verified'>('unknown');

    return {
      status,
      setStatus,
      getCode() {
        return codeRef.current;
      },
      setCode(code: string | undefined) {
        codeRef.current = code;
      },
    };
  }
);

const InnerVerificationProvider: FunctionComponent = ({ children }) => {
  const { http } = useKibana();
  const { status, setStatus, setCode } = useVerification();

  useEffect(() => {
    return http.intercept({
      responseError: (error) => {
        if (error.response?.status === 403) {
          setStatus('unverified');
          setCode(undefined);
        }
      },
    });
  }, [http]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {status === 'unverified' && (
        <EuiModal onClose={() => setStatus('unknown')} maxWidth={euiThemeVars.euiBreakpoints.s}>
          <EuiModalHeader>
            <VerificationCodeForm
              onSuccess={(values) => {
                setStatus('verified');
                setCode(values.code);
              }}
            />
          </EuiModalHeader>
        </EuiModal>
      )}
      {children}
    </>
  );
};

export const VerificationProvider: FunctionComponent<VerificationProps> = ({
  defaultCode,
  children,
}) => {
  return (
    <OuterVerificationProvider defaultCode={defaultCode}>
      <InnerVerificationProvider>{children}</InnerVerificationProvider>
    </OuterVerificationProvider>
  );
};

export { useVerification };
