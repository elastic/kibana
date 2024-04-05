/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, {
  useMemo,
  Fragment,
  type ComponentProps,
  type FC,
  type ReactElement,
  useCallback,
  useState,
} from 'react';
import {
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiTabs,
  EuiTab,
  EuiToolTip,
  type EuiTabProps,
  type CommonProps,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  ModalContextProvider,
  useModalContext,
  type ITabDeclaration,
  type IDispatchFunction,
  type IModalContextProviderProps,
} from './context';

export type IModalTabContent<S> = (props: {
  state: S;
  dispatch: IDispatchFunction;
}) => ReactElement;

interface IModalTabActionBtn<S> extends CommonProps {
  id: string;
  dataTestSubj: string;
  label: string;
  handler: (args: { state: S }) => void;
  isCopy?: boolean;
  style?: (args: { state: S }) => boolean;
}

export interface IModalTabDeclaration<S = {}> extends EuiTabProps, ITabDeclaration<S> {
  description?: string;
  'data-test-subj'?: string;
  content: IModalTabContent<S>;
  modalActionBtn?: IModalTabActionBtn<S>;
}

export interface ITabbedModalInner extends Pick<ComponentProps<typeof EuiModal>, 'onClose'> {
  modalWidth?: number;
  modalTitle?: string;
}

const TabbedModalInner: FC<ITabbedModalInner> = ({ onClose, modalTitle, modalWidth }) => {
  // EuiCopy equivalent
  const [, setIsTextVisible] = useState<boolean>(false);
  const afterMessage = (
    <FormattedMessage id="sharedUXPackages.afterMessageClick" defaultMessage="Copied" />
  );

  const { tabs, state, dispatch } =
    useModalContext<Array<IModalTabDeclaration<Record<string, any>>>>();

  const selectedTabId = state.meta.selectedTabId;
  const selectedTabState = useMemo(
    () => (selectedTabId ? state[selectedTabId] : {}),
    [selectedTabId, state]
  );

  const { content: SelectedTabContent, modalActionBtn } = useMemo(() => {
    return tabs.find((obj) => obj.id === selectedTabId)!;
  }, [selectedTabId, tabs]);

  const onSelectedTabChanged = useCallback(
    (id: string) => {
      dispatch({ type: 'META_selectedTabId', payload: id });
    },
    [dispatch]
  );

  const renderTabs = useCallback(() => {
    return tabs.map((tab, index) => {
      return (
        <EuiTab
          key={index}
          onClick={() => onSelectedTabChanged(tab.id)}
          isSelected={tab.id === selectedTabId}
          disabled={tab.disabled}
          prepend={tab.prepend}
          append={tab.append}
        >
          {tab.name}
        </EuiTab>
      );
    });
  }, [onSelectedTabChanged, selectedTabId, tabs]);

  return (
    <EuiModal
      onClose={onClose}
      style={{ ...(modalWidth ? { width: modalWidth } : {}) }}
      maxWidth={true}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>{modalTitle}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <Fragment>
          <EuiTabs>{renderTabs()}</EuiTabs>
          {React.createElement(SelectedTabContent, {
            state: selectedTabState,
            dispatch,
          })}
        </Fragment>
      </EuiModalBody>
      {modalActionBtn && (
        <EuiModalFooter>
          <EuiToolTip content={afterMessage} onMouseOut={() => setIsTextVisible(false)}>
            <EuiButton
              isDisabled={
                modalActionBtn.style ? modalActionBtn.style({ state: selectedTabState }) : false
              }
              fill
              data-test-subj={modalActionBtn.dataTestSubj}
              data-share-url={state.url}
              onClick={() => {
                // @ts-ignore state will not be null because of the modalActionBtn check
                modalActionBtn!.handler!({ state: selectedTabId });
                setIsTextVisible(true);
              }}
            >
              {modalActionBtn.label}
            </EuiButton>
          </EuiToolTip>
        </EuiModalFooter>
      )}
    </EuiModal>
  );
};

export function TabbedModal<T extends Array<IModalTabDeclaration<any>>>({
  tabs,
  defaultSelectedTabId,
  ...rest
}: Omit<IModalContextProviderProps<T>, 'children'> & ITabbedModalInner) {
  return (
    <ModalContextProvider tabs={tabs} defaultSelectedTabId={defaultSelectedTabId}>
      <TabbedModalInner {...rest} />
    </ModalContextProvider>
  );
}
