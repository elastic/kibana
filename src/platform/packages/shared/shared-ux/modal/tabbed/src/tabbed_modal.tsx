/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  useMemo,
  useCallback,
  Fragment,
  type ComponentProps,
  type FC,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Global } from '@emotion/react';
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
  useGeneratedHtmlId,
  EuiSpacer,
} from '@elastic/eui';
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

export interface ITabbedModalInner
  extends Pick<ComponentProps<typeof EuiModal>, 'onClose' | 'outsideClickCloses'> {
  modalWidth?: number;
  modalTitle?: string;
  anchorElement?: HTMLElement;
  aboveTabsContent?: ReactNode;
  'data-test-subj'?: string;
}

const TabbedModalInner: FC<ITabbedModalInner> = ({
  onClose,
  modalTitle,
  modalWidth,
  anchorElement,
  aboveTabsContent: AboveTabsContent,
  outsideClickCloses,
  ...props
}) => {
  const { tabs, state, dispatch } =
    useModalContext<Array<IModalTabDeclaration<Record<string, any>>>>();
  const { selectedTabId } = state.meta;
  const tabbedModalHTMLId = useGeneratedHtmlId({ prefix: 'tabbedModal' });
  const tabbedModalHeadingHTMLId = useGeneratedHtmlId({ prefix: 'tabbedModalHeading' });

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
    if (tabs.length === 1) {
      return null;
    }

    return (
      <EuiTabs>
        {tabs.map((tab, index) => {
          return (
            <EuiTab
              key={index}
              onClick={() => onSelectedTabChanged(tab.id)}
              isSelected={tab.id === selectedTabId}
              disabled={tab.disabled}
              prepend={tab.prepend}
              append={tab.append}
              data-test-subj={tab.id}
            >
              {tab.name}
            </EuiTab>
          );
        })}
      </EuiTabs>
    );
  }, [onSelectedTabChanged, selectedTabId, tabs]);

  return (
    <EuiModal
      id={tabbedModalHTMLId}
      onClose={() => {
        onClose();
        setTimeout(() => anchorElement?.focus(), 1);
      }}
      maxWidth={true}
      data-test-subj={props['data-test-subj']}
      css={{
        ...(modalWidth ? { width: modalWidth } : {}),
      }}
      aria-labelledby={tabbedModalHeadingHTMLId}
      outsideClickCloses={outsideClickCloses}
    >
      <Global
        styles={{
          // overrides so modal retains a fixed position from top of viewport, despite having content of varying heights
          [`.euiOverlayMask:has([id="${tabbedModalHTMLId}"])`]: {
            alignItems: 'flex-start',
            paddingBlockStart: '20vh',
          },
        }}
      />
      <EuiModalHeader>
        <EuiModalHeaderTitle id={tabbedModalHeadingHTMLId}>{modalTitle}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {AboveTabsContent && (
          <div data-test-subj="tabbedModal-above-tabs-content">{AboveTabsContent}</div>
        )}
        <Fragment>{renderTabs()}</Fragment>
        <EuiSpacer size="m" />
        <div css={{ display: 'contents' }} data-test-subj={`tabbedModal-${selectedTabId}-content`}>
          <SelectedTabContent
            {...{
              state: selectedTabState,
              dispatch,
            }}
          />
        </div>
      </EuiModalBody>
      {modalActionBtn?.id !== undefined && selectedTabState && (
        <EuiModalFooter>
          <EuiButton
            fill
            data-test-subj={modalActionBtn.dataTestSubj}
            data-share-url={state.url}
            onClick={() => {
              modalActionBtn.handler({ state: selectedTabState });
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
