/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useEffect, useCallback } from 'react';
import { css } from '@emotion/react';
import {
  EuiPopover,
  EuiHorizontalRule,
  EuiButton,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  useEuiTheme,
  useGeneratedHtmlId,
  EuiIcon,
  EuiText,
  EuiContextMenuPanelProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiToolTip,
} from '@elastic/eui';
import type { DataViewListItem } from '@kbn/data-views-plugin/public';
import { IDataPluginServices } from '@kbn/data-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataViewPickerPropsExtended } from '.';
import { DataViewsList } from './dataview_list';
import type { TextBasedLanguagesListProps } from './text_languages_list';
import type { TextBasedLanguagesTransitionModalProps } from './text_languages_transition_modal';
import { changeDataViewStyles } from './change_dataview.styles';

// local storage key for the text based languages transition modal
const TEXT_LANG_TRANSITION_MODAL_KEY = 'data.textLangTransitionModal';

const Fallback = () => <div />;

const LazyTextBasedLanguagesTransitionModal = React.lazy(
  () => import('./text_languages_transition_modal')
);
export const TextBasedLanguagesTransitionModal = (
  props: TextBasedLanguagesTransitionModalProps
) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyTextBasedLanguagesTransitionModal {...props} />
  </React.Suspense>
);

const LazyTextBasedLanguagesList = React.lazy(() => import('./text_languages_list'));
export const TextBasedLanguagesList = (props: TextBasedLanguagesListProps) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyTextBasedLanguagesList {...props} />
  </React.Suspense>
);

export function ChangeDataView({
  isMissingCurrent,
  currentDataViewId,
  onChangeDataView,
  onAddField,
  onDataViewCreated,
  trigger,
  selectableProps,
  textBasedLanguages,
  onSaveTextLanguageQuery,
  onTextLangQuerySubmit,
  textBasedLanguage,
}: DataViewPickerPropsExtended) {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);
  const [dataViewsList, setDataViewsList] = useState<DataViewListItem[]>([]);
  const [triggerLabel, setTriggerLabel] = useState('');
  const [isTextBasedLangSelected, setIsTextBasedLangSelected] = useState(
    Boolean(textBasedLanguage)
  );
  const [isTextLangTransitionModalVisible, setIsTextLangTransitionModalVisible] = useState(false);
  const [selectedDataViewId, setSelectedDataViewId] = useState(currentDataViewId);

  const kibana = useKibana<IDataPluginServices>();
  const { application, data, storage } = kibana.services;
  const styles = changeDataViewStyles({ fullWidth: trigger.fullWidth });
  const [isTextLangTransitionModalDismissed, setIsTextLangTransitionModalDismissed] = useState(() =>
    Boolean(storage.get(TEXT_LANG_TRANSITION_MODAL_KEY))
  );

  // Create a reusable id to ensure search input is the first focused item in the popover even though it's not the first item
  const searchListInputId = useGeneratedHtmlId({ prefix: 'dataviewPickerListSearchInput' });

  useEffect(() => {
    const fetchDataViews = async () => {
      const dataViewsRefs = await data.dataViews.getIdsWithTitle();
      setDataViewsList(dataViewsRefs);
    };
    fetchDataViews();
  }, [data, currentDataViewId]);

  useEffect(() => {
    if (trigger.label) {
      if (textBasedLanguage) {
        setTriggerLabel(textBasedLanguage.toUpperCase());
      } else {
        setTriggerLabel(trigger.label);
      }
    }
  }, [textBasedLanguage, trigger.label]);

  useEffect(() => {
    if (Boolean(textBasedLanguage) !== isTextBasedLangSelected) {
      setIsTextBasedLangSelected(Boolean(textBasedLanguage));
    }
  }, [isTextBasedLangSelected, textBasedLanguage]);

  const createTrigger = function () {
    const { label, title, 'data-test-subj': dataTestSubj, fullWidth, ...rest } = trigger;
    return (
      <EuiButton
        css={styles.trigger}
        data-test-subj={dataTestSubj}
        onClick={() => {
          setPopoverIsOpen(!isPopoverOpen);
        }}
        color={isMissingCurrent ? 'danger' : 'primary'}
        iconSide="right"
        iconType="arrowDown"
        title={title}
        fullWidth={fullWidth}
        {...rest}
      >
        {triggerLabel}
      </EuiButton>
    );
  };

  const getPanelItems = () => {
    const panelItems: EuiContextMenuPanelProps['items'] = [];
    if (onAddField && !isTextBasedLangSelected) {
      panelItems.push(
        <EuiContextMenuItem
          key="add"
          icon="indexOpen"
          data-test-subj="indexPattern-add-field"
          onClick={() => {
            setPopoverIsOpen(false);
            onAddField();
          }}
        >
          {i18n.translate('unifiedSearch.query.queryBar.indexPattern.addFieldButton', {
            defaultMessage: 'Add a field to this data view',
          })}
        </EuiContextMenuItem>,
        <EuiContextMenuItem
          key="manage"
          icon="indexSettings"
          data-test-subj="indexPattern-manage-field"
          onClick={() => {
            setPopoverIsOpen(false);
            application.navigateToApp('management', {
              path: `/kibana/indexPatterns/patterns/${currentDataViewId}`,
            });
          }}
        >
          {i18n.translate('unifiedSearch.query.queryBar.indexPattern.manageFieldButton', {
            defaultMessage: 'Manage this data view',
          })}
        </EuiContextMenuItem>,
        <EuiHorizontalRule margin="none" />
      );
    }
    panelItems.push(
      <>
        {onDataViewCreated && (
          <EuiFlexGroup
            alignItems="center"
            gutterSize="none"
            justifyContent="spaceBetween"
            responsive={false}
            css={css`
              margin: ${euiTheme.size.s};
              margin-bottom: 0;
            `}
          >
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                <EuiFlexItem grow={false}>
                  {Boolean(isTextBasedLangSelected) ? (
                    <EuiToolTip
                      position="top"
                      content={i18n.translate(
                        'unifiedSearch.query.queryBar.indexPattern.textBasedLangSwitchWarning',
                        {
                          defaultMessage:
                            "Switching data views removes the current SQL query. Save this search to ensure you don't lose work.",
                        }
                      )}
                    >
                      <EuiIcon
                        type="alert"
                        color="warning"
                        data-test-subj="textBasedLang-warning"
                      />
                    </EuiToolTip>
                  ) : null}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <h5>
                      {i18n.translate('unifiedSearch.query.queryBar.indexPattern.dataViewsLabel', {
                        defaultMessage: 'Data views',
                      })}
                    </h5>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={() => {
                  setPopoverIsOpen(false);
                  onDataViewCreated();
                }}
                size="xs"
                iconType="plusInCircleFilled"
                iconSide="left"
                data-test-subj="dataview-create-new"
              >
                {i18n.translate('unifiedSearch.query.queryBar.indexPattern.addNewDataView', {
                  defaultMessage: 'Create a data view',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}

        <DataViewsList
          dataViewsList={dataViewsList}
          onChangeDataView={async (newId) => {
            const dataView = await data.dataViews.get(newId);
            await data.dataViews.refreshFields(dataView);
            setSelectedDataViewId(newId);
            setPopoverIsOpen(false);
            if (isTextBasedLangSelected && !isTextLangTransitionModalDismissed) {
              setIsTextLangTransitionModalVisible(true);
            } else if (isTextBasedLangSelected && isTextLangTransitionModalDismissed) {
              setIsTextBasedLangSelected(false);
              // clean up the Text based language query
              onTextLangQuerySubmit?.({
                language: 'kql',
                query: '',
              });
              onChangeDataView(newId);
              setTriggerLabel(trigger.label);
            } else {
              onChangeDataView(newId);
            }
          }}
          currentDataViewId={currentDataViewId}
          selectableProps={selectableProps}
          searchListInputId={searchListInputId}
          isTextBasedLangSelected={isTextBasedLangSelected}
        />
      </>
    );

    if (textBasedLanguages?.length) {
      panelItems.push(
        <EuiHorizontalRule margin="none" />,
        <EuiFlexGroup
          alignItems="center"
          gutterSize="none"
          justifyContent="spaceBetween"
          data-test-subj="select-text-based-language-panel"
          css={css`
            margin: ${euiTheme.size.s};
            margin-bottom: 0;
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <h5>
                {i18n.translate(
                  'unifiedSearch.query.queryBar.indexPattern.textBasedLanguagesLabel',
                  {
                    defaultMessage: 'Text-based query languages',
                  }
                )}
              </h5>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>,
        <TextBasedLanguagesList
          textBasedLanguages={textBasedLanguages}
          selectedOption={triggerLabel}
          onChange={(lang) => {
            setTriggerLabel(lang);
            setPopoverIsOpen(false);
            setIsTextBasedLangSelected(true);
            // also update the query with the sql query
            onTextLangQuerySubmit?.({ sql: `SELECT * FROM "${trigger.title}"` });
          }}
        />
      );
    }

    return panelItems;
  };

  let modal;

  const onTransitionModalDismiss = useCallback(() => {
    storage.set(TEXT_LANG_TRANSITION_MODAL_KEY, true);
    setIsTextLangTransitionModalDismissed(true);
  }, [storage]);

  const cleanup = useCallback(
    (shouldDismissModal: boolean) => {
      setIsTextLangTransitionModalVisible(false);
      setIsTextBasedLangSelected(false);
      // clean up the Text based language query
      onTextLangQuerySubmit?.({
        language: 'kql',
        query: '',
      });
      if (selectedDataViewId) {
        onChangeDataView(selectedDataViewId);
      }
      setTriggerLabel(trigger.label);
      if (shouldDismissModal) {
        onTransitionModalDismiss();
      }
    },
    [
      onChangeDataView,
      onTextLangQuerySubmit,
      onTransitionModalDismiss,
      selectedDataViewId,
      trigger.label,
    ]
  );

  const onModalClose = useCallback(
    (shouldDismissModal: boolean, needsSave?: boolean) => {
      if (Boolean(needsSave)) {
        setIsTextLangTransitionModalVisible(false);
        onSaveTextLanguageQuery?.({
          onSave: () => {
            cleanup(shouldDismissModal);
          },
          onCancel: () => {
            setIsTextLangTransitionModalVisible(false);
          },
        });
      } else {
        cleanup(shouldDismissModal);
      }
    },
    [cleanup, onSaveTextLanguageQuery]
  );

  if (isTextLangTransitionModalVisible && !isTextLangTransitionModalDismissed) {
    modal = (
      <TextBasedLanguagesTransitionModal
        closeModal={onModalClose}
        setIsTextLangTransitionModalVisible={setIsTextLangTransitionModalVisible}
      />
    );
  }

  return (
    <>
      <EuiPopover
        panelClassName="changeDataViewPopover"
        button={createTrigger()}
        panelProps={{
          ['data-test-subj']: 'changeDataViewPopover',
        }}
        isOpen={isPopoverOpen}
        closePopover={() => setPopoverIsOpen(false)}
        panelPaddingSize="none"
        initialFocus={!isTextBasedLangSelected ? `#${searchListInputId}` : undefined}
        display="block"
        buffer={8}
      >
        <div css={styles.popoverContent}>
          <EuiContextMenuPanel size="s" items={getPanelItems()} />
        </div>
      </EuiPopover>
      {modal}
    </>
  );
}
