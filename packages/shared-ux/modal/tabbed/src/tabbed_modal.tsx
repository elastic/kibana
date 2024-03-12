/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, Fragment, type ComponentProps, type FC } from 'react';
import {
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiTabs,
  EuiTab,
  EuiCopy,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  ModalContextProvider,
  useModalContext,
  type IModalTabState,
  type IModalTabDeclaration,
  type IModalContextProviderProps,
} from './context';

interface ITabbedModalInner extends Pick<ComponentProps<typeof EuiModal>, 'onClose'> {
  modalTitle?: string;
}

const TabbedModalInner: FC<ITabbedModalInner> = ({ onClose }) => {
  const { tabs, state, dispatch } = useModalContext();

  const selectedTabId = state.meta.selectedTabId;
  const selectedTabState = useMemo(
    () => (selectedTabId ? state[selectedTabId] : {}),
    [selectedTabId, state]
  );

  const {
    content: SelectedTabContent,
    description: string,
    modalActionBtn: { defaultMessage, handler, dataTestSubj, formattedMessageId, isCopy },
    title,
  } = useMemo(() => {
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

  const tempHandler = useMemo(
    () => (isCopy ? handler({ state: selectedTabState }) : ''),
    [isCopy, handler, selectedTabState]
  );

  const renderButton = () => {
    return isCopy ? (
      <EuiCopy textToCopy={tempHandler}>
        {(copy) => (
          <EuiButton fill data-test-subj={dataTestSubj} data-share-url={state.url} onClick={copy}>
            <FormattedMessage id={formattedMessageId} defaultMessage={defaultMessage} />
          </EuiButton>
        )}
      </EuiCopy>
    ) : (
      <EuiButton fill data-test-subj={dataTestSubj} data-share-url={state.url}>
        <FormattedMessage id={formattedMessageId} defaultMessage={defaultMessage} />
      </EuiButton>
    );
  };

  // const btnClickHandler = useCallback(() => {
  //   handler!({ state: selectedTabState });
  // }, [handler, selectedTabState]);

  return (
    <EuiModal onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <Fragment>
          <EuiTabs>{renderTabs()}</EuiTabs>
          {React.createElement(SelectedTabContent!, {
            state: selectedTabState,
            dispatch,
          })}
        </Fragment>
      </EuiModalBody>
      <EuiModalFooter>
        {isCopy ? (
          <EuiCopy textToCopy={tempHandler}>
            {(copy) => (
              <EuiButton
                fill
                data-test-subj={dataTestSubj}
                data-share-url={state.url}
                onClick={copy}
              >
                <FormattedMessage id={formattedMessageId} defaultMessage={defaultMessage} />
              </EuiButton>
            )}
          </EuiCopy>
        ) : (
          <EuiButton fill data-test-subj={dataTestSubj} data-share-url={state.url}>
            <FormattedMessage id={formattedMessageId} defaultMessage={defaultMessage} />
          </EuiButton>
        )}
      </EuiModalFooter>
    </EuiModal>
  );
};

export function TabbedModal<T extends Array<IModalTabDeclaration<IModalTabState>>>({
  tabs,
  selectedTabId,
  ...rest
}: Omit<IModalContextProviderProps<T>, 'children'> & ITabbedModalInner) {
  return (
    <ModalContextProvider tabs={tabs} selectedTabId={selectedTabId}>
      <TabbedModalInner {...rest} />
    </ModalContextProvider>
  );
}
