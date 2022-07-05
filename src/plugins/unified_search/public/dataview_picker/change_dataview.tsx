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
  EuiLink,
  EuiText,
  EuiTourStep,
  EuiContextMenuPanelProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import type { DataViewListItem } from '@kbn/data-views-plugin/public';
import { IDataPluginServices } from '@kbn/data-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataViewPickerPropsExtended } from '.';
import { DataViewsList } from './dataview_list';
import type { TextBasedLanguagesListProps } from './text_languages_list';
import type { TextBasedLanguagesTransitionModalProps } from './text_languages_transition_modal';
import { changeDataViewStyles } from './change_dataview.styles';

// local storage key for the tour component
const NEW_DATA_VIEW_MENU_STORAGE_KEY = 'data.newDataViewMenu';
// local storage key for the text based languages transition modal
const TEXT_LANG_TRANSITION_MODAL_KEY = 'data.textLangTransitionModal';

const newMenuTourTitle = i18n.translate('unifiedSearch.query.dataViewMenu.newMenuTour.title', {
  defaultMessage: 'A better data view menu',
});

const newMenuTourDescription = i18n.translate(
  'unifiedSearch.query.dataViewMenu.newMenuTour.description',
  {
    defaultMessage:
      'This menu now offers all the tools you need to create, find, and edit your data views.',
  }
);

const newMenuTourDismissLabel = i18n.translate(
  'unifiedSearch.query.dataViewMenu.newMenuTour.dismissLabel',
  {
    defaultMessage: 'Got it',
  }
);

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
  showNewMenuTour = false,
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

  const kibana = useKibana<IDataPluginServices>();
  const { application, data, storage } = kibana.services;
  const styles = changeDataViewStyles({ fullWidth: trigger.fullWidth });
  const [isTextLangTransitionModalDismissed, setIsTextLangTransitionModalDismissed] = useState(() =>
    Boolean(storage.get(TEXT_LANG_TRANSITION_MODAL_KEY))
  );
  const [isTourDismissed, setIsTourDismissed] = useState(() =>
    Boolean(storage.get(NEW_DATA_VIEW_MENU_STORAGE_KEY))
  );
  const [isTourOpen, setIsTourOpen] = useState(false);

  useEffect(() => {
    if (showNewMenuTour && !isTourDismissed) {
      setIsTourOpen(true);
    }
  }, [isTourDismissed, setIsTourOpen, showNewMenuTour]);

  const onTourDismiss = () => {
    storage.set(NEW_DATA_VIEW_MENU_STORAGE_KEY, true);
    setIsTourDismissed(true);
    setIsTourOpen(false);
  };

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
          setIsTourOpen(false);
          // onTourDismiss(); TODO: Decide if opening the menu should also dismiss the tour
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
    if (onAddField) {
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
            css={css`
              margin: ${euiTheme.size.s};
              margin-bottom: 0;
            `}
          >
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <h5>
                  {i18n.translate('unifiedSearch.query.queryBar.indexPattern.dataViewsLabel', {
                    defaultMessage: 'Data views',
                  })}
                </h5>
              </EuiText>
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
          onChangeDataView={(newId) => {
            onChangeDataView(newId);
            setPopoverIsOpen(false);
            if (isTextBasedLangSelected && !isTextLangTransitionModalDismissed) {
              setIsTextLangTransitionModalVisible(true);
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
          ,
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
      // clean up the Text based language jQuery
      onTextLangQuerySubmit?.();
      setTriggerLabel(trigger.label);
      if (shouldDismissModal) {
        onTransitionModalDismiss();
      }
    },
    [onTextLangQuerySubmit, onTransitionModalDismiss, trigger.label]
  );

  const onModalClose = useCallback(
    (shouldDismissModal: boolean, needsSave?: boolean) => {
      if (Boolean(needsSave)) {
        onSaveTextLanguageQuery?.({
          onSave: () => {
            cleanup(shouldDismissModal);
          },
        });
      } else {
        cleanup(shouldDismissModal);
      }
    },
    [cleanup, onSaveTextLanguageQuery]
  );

  if (isTextLangTransitionModalVisible && !isTextLangTransitionModalDismissed) {
    modal = <TextBasedLanguagesTransitionModal closeModal={onModalClose} />;
  }

  return (
    <>
      <EuiTourStep
        title={
          <>
            <EuiIcon type="bell" size="s" /> &nbsp; {newMenuTourTitle}
          </>
        }
        content={
          <EuiText css={styles.popoverContent}>
            <p>{newMenuTourDescription}</p>
          </EuiText>
        }
        isStepOpen={isTourOpen}
        onFinish={onTourDismiss}
        step={1}
        stepsTotal={1}
        footerAction={
          <EuiLink data-test-subj="dataViewPickerTourLink" onClick={onTourDismiss}>
            {newMenuTourDismissLabel}
          </EuiLink>
        }
        repositionOnScroll
        display="block"
      >
        <EuiPopover
          panelClassName="changeDataViewPopover"
          button={createTrigger()}
          panelProps={{
            ['data-test-subj']: 'changeDataViewPopover',
          }}
          isOpen={isPopoverOpen}
          closePopover={() => setPopoverIsOpen(false)}
          panelPaddingSize="none"
          initialFocus={`#${searchListInputId}`}
          display="block"
          buffer={8}
        >
          <div css={styles.popoverContent}>
            <EuiContextMenuPanel size="s" items={getPanelItems()} />
          </div>
        </EuiPopover>
      </EuiTourStep>
      {modal}
    </>
  );
}
