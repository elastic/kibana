/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, Fragment, type ComponentProps, type FC, type ReactElement } from 'react';
import {
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiTabs,
  EuiTab,
  type EuiTabProps,
  type CommonProps,
} from '@elastic/eui';
import {
  ModalContextProvider,
  useModalContext,
  type ITabDeclaration,
  type IDispatchFunction,
  type IModalContextProviderProps,
} from './context';

export type IModalTabContent<S> = (props: {
  state: S | null;
  dispatch: IDispatchFunction;
}) => ReactElement;

interface IModalTabActionBtn<S> extends CommonProps {
  id: string;
  dataTestSubj: string;
  label: string;
  handler?: (args: { state: S }) => void;
  isCopy?: boolean;
}

export interface IModalTabDeclaration<S = {}> extends EuiTabProps, ITabDeclaration<S> {
  description?: string;
  'data-test-subj'?: string;
  content: IModalTabContent<S>;
  modalActionBtn: IModalTabActionBtn<S>;
}

interface ITabbedModalInner extends Pick<ComponentProps<typeof EuiModal>, 'onClose'> {
  modalWidth?: number;
  modalTitle?: string;
}

const TabbedModalInner: FC<ITabbedModalInner> = ({ onClose, modalTitle, modalWidth }) => {
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

  const onSelectedTabChanged = (id: string) => {
    dispatch({ type: 'META_selectedTabId', payload: id });
  };

  const renderTabs = () => {
    return tabs.map((tab, index) => (
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
    ));
  };

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
          <EuiButton
            fill
            data-test-subj={modalActionBtn.dataTestSubj}
            data-share-url={state.url}
            onClick={() => {
              // @ts-ignore null for export modal on state since it's not using the buttons
              modalActionBtn!.handler!({ state: selectedTabId });
            }}
          >
            {modalActionBtn.label}
          </EuiButton>
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
