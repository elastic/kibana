/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { IUnifiedSearchPluginServices } from '../types';
import type { DataViewPickerPropsExtended } from './data_view_picker';
import type { DataViewListItemEnhanced } from './dataview_list';
import type { TextBasedLanguagesListProps } from './text_languages_list';
import type { TextBasedLanguagesTransitionModalProps } from './text_languages_transition_modal';
import adhoc from './assets/adhoc.svg';
import { changeDataViewStyles } from './change_dataview.styles';
import { DataViewSelector } from './data_view_selector';

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

const mapAdHocDataView = (adHocDataView: DataView) => {
  return {
    title: adHocDataView.title,
    name: adHocDataView.name,
    id: adHocDataView.id!,
    isAdhoc: true,
  };
};

export function ChangeDataView({
  isMissingCurrent,
  currentDataViewId,
  adHocDataViews,
  savedDataViews,
  onChangeDataView,
  onAddField,
  onDataViewCreated,
  trigger,
  selectableProps,
  textBasedLanguages,
  onSaveTextLanguageQuery,
  onTextLangQuerySubmit,
  textBasedLanguage,
  isDisabled,
  onEditDataView,
  onCreateDefaultAdHocDataView,
}: DataViewPickerPropsExtended) {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);
  const [dataViewsList, setDataViewsList] = useState<DataViewListItemEnhanced[]>([]);
  const [triggerLabel, setTriggerLabel] = useState('');
  const [isTextBasedLangSelected, setIsTextBasedLangSelected] = useState(
    Boolean(textBasedLanguage)
  );
  const [isTextLangTransitionModalVisible, setIsTextLangTransitionModalVisible] = useState(false);
  const [selectedDataViewId, setSelectedDataViewId] = useState(currentDataViewId);

  const kibana = useKibana<IUnifiedSearchPluginServices>();
  const { application, data, storage, dataViews, dataViewEditor } = kibana.services;
  const styles = changeDataViewStyles({ fullWidth: trigger.fullWidth });
  const [isTextLangTransitionModalDismissed, setIsTextLangTransitionModalDismissed] = useState(() =>
    Boolean(storage.get(TEXT_LANG_TRANSITION_MODAL_KEY))
  );

  // Create a reusable id to ensure search input is the first focused item in the popover even though it's not the first item
  const searchListInputId = useGeneratedHtmlId({ prefix: 'dataviewPickerListSearchInput' });

  useEffect(() => {
    const fetchDataViews = async () => {
      const savedDataViewRefs: DataViewListItemEnhanced[] = savedDataViews
        ? savedDataViews
        : await data.dataViews.getIdsWithTitle();
      const adHocDataViewRefs: DataViewListItemEnhanced[] =
        adHocDataViews?.map(mapAdHocDataView) || [];

      setDataViewsList(savedDataViewRefs.concat(adHocDataViewRefs));
    };
    fetchDataViews();
  }, [data, currentDataViewId, adHocDataViews, savedDataViews, isTextBasedLangSelected]);

  useEffect(() => {
    if (textBasedLanguage) {
      setTriggerLabel(textBasedLanguage.toUpperCase());
    } else {
      setTriggerLabel(trigger.label);
    }
  }, [textBasedLanguage, trigger.label]);

  useEffect(() => {
    if (Boolean(textBasedLanguage) !== isTextBasedLangSelected) {
      setIsTextBasedLangSelected(Boolean(textBasedLanguage));
    }
  }, [isTextBasedLangSelected, textBasedLanguage]);

  const isAdHocSelected = useMemo(() => {
    return adHocDataViews?.some((dataView) => dataView.id === currentDataViewId);
  }, [adHocDataViews, currentDataViewId]);

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
        title={triggerLabel}
        fullWidth={fullWidth}
        disabled={isDisabled}
        textProps={{ className: 'eui-textTruncate' }}
        {...rest}
      >
        <>
          {/* we don't want to display the adHoc icon on text based mode */}
          {isAdHocSelected && !isTextBasedLangSelected && (
            <EuiIcon
              type={adhoc}
              color="primary"
              css={css`
                margin-right: ${euiTheme.size.s};
              `}
            />
          )}
          {triggerLabel}
        </>
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
        onEditDataView || dataViewEditor.userPermissions.editDataView() ? (
          <EuiContextMenuItem
            key="manage"
            icon="indexSettings"
            data-test-subj="indexPattern-manage-field"
            onClick={async () => {
              if (onEditDataView) {
                const dataView = await dataViews.get(currentDataViewId!);
                dataViewEditor.openEditor({
                  editData: dataView,
                  onSave: (updatedDataView) => {
                    onEditDataView(updatedDataView);
                  },
                });
              } else {
                application.navigateToApp('management', {
                  path: `/kibana/indexPatterns/patterns/${currentDataViewId}`,
                });
              }
              setPopoverIsOpen(false);
            }}
          >
            {i18n.translate('unifiedSearch.query.queryBar.indexPattern.manageFieldButton', {
              defaultMessage: 'Manage this data view',
            })}
          </EuiContextMenuItem>
        ) : (
          <React.Fragment />
        ),
        <EuiHorizontalRule margin="none" key="dataviewActions-divider" />
      );
    }
    panelItems.push(
      <React.Fragment key="add-dataview">
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
                  // go to dataview mode
                  if (isTextBasedLangSelected) {
                    setIsTextBasedLangSelected(false);
                    // clean up the Text based language query
                    onTextLangQuerySubmit?.({
                      language: 'kuery',
                      query: '',
                    });
                    setTriggerLabel(trigger.label);
                  }
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
        <DataViewSelector
          currentDataViewId={currentDataViewId}
          searchListInputId={searchListInputId}
          dataViewsList={dataViewsList}
          selectableProps={selectableProps}
          isTextBasedLangSelected={isTextBasedLangSelected}
          setPopoverIsOpen={setPopoverIsOpen}
          onChangeDataView={async (newId) => {
            // refreshing the field list
            await dataViews.get(newId, false, true);
            setSelectedDataViewId(newId);
            setPopoverIsOpen(false);
            if (isTextBasedLangSelected && !isTextLangTransitionModalDismissed) {
              setIsTextLangTransitionModalVisible(true);
            } else if (isTextBasedLangSelected && isTextLangTransitionModalDismissed) {
              setIsTextBasedLangSelected(false);
              // clean up the Text based language query
              onTextLangQuerySubmit?.({
                language: 'kuery',
                query: '',
              });
              onChangeDataView(newId);
              setTriggerLabel(trigger.label);
            } else {
              onChangeDataView(newId);
            }
          }}
          onCreateDefaultAdHocDataView={onCreateDefaultAdHocDataView}
        />
      </React.Fragment>
    );

    if (textBasedLanguages?.length) {
      panelItems.push(
        <EuiHorizontalRule margin="none" key="textbasedLanguages-divider" />,
        <EuiFlexGroup
          alignItems="center"
          gutterSize="none"
          justifyContent="spaceBetween"
          data-test-subj="select-text-based-language-panel"
          key="text-based-languages-switcher"
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
        language: 'kuery',
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
